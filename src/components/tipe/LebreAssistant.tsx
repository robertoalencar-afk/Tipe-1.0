import { useRef, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { Check, FileText, Loader2, MessageCircle, Mic, Paperclip, Square, X } from "lucide-react";
import { HareOutline } from "@/components/tipe/HareOutline";
import { Button } from "@/components/ui/button";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Conversation, ConversationContent, ConversationScrollButton } from "@/components/ai-elements/conversation";
import { Message, MessageContent, MessageResponse } from "@/components/ai-elements/message";
import { PromptInput, PromptInputBody, PromptInputButton, PromptInputFooter, PromptInputHeader, PromptInputSubmit, PromptInputTextarea, PromptInputTools, usePromptInputAttachments, type PromptInputMessage } from "@/components/ai-elements/prompt-input";
import { Tool, ToolContent, ToolHeader, ToolInput, ToolOutput } from "@/components/ai-elements/tool";
import { askPublicLebre, askRestaurantLebre, executeLebreProposal, transcribeLebreAudio, type LebreFile, type LebreProposal } from "@/lib/tipe/lebre.functions";
import lebre from "@/assets/lebre-ai-official.svg";

type ChatMessage = { id: string; role: "user" | "assistant"; text: string; files?: { name: string; mediaType: string; url: string }[]; proposal?: LebreProposal; result?: string; error?: string };

const publicSuggestions = ["Como a TIPE funciona?", "Preciso trocar meu PDV?", "Como são os 30 dias grátis?"];
const panelSuggestions = ["Abrir a mesa 5", "Cadastrar a mesa 21", "Cadastrar o garçom João Mendes, e-mail joao@email.com", "Pausar o item Suco de laranja", "Resuma a situação do salão"];
const panelExamples = [
  { title: "Mesas", text: "Cadastrar, abrir ou desativar mesas" },
  { title: "Equipe", text: "Cadastrar garçom e enviar convite por e-mail" },
  { title: "Cardápio", text: "Pausar ou reativar itens" },
  { title: "Salão", text: "Resumo de mesas e pagamentos pendentes" },
];
const ACCEPT = "image/png,image/jpeg,image/webp,image/gif,application/pdf";
const MAX_FILE = 5 * 1024 * 1024;
const MAX_AUDIO_MS = 60_000;

function blobToBase64(blob: Blob) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result).split(",")[1] ?? "");
    reader.onerror = () => reject(new Error("Não foi possível ler o áudio."));
    reader.readAsDataURL(blob);
  });
}

function AttachmentChips() {
  const attachments = usePromptInputAttachments();
  if (!attachments.files.length) return null;
  return (
    <PromptInputHeader className="flex flex-wrap gap-2 px-3 pt-3">
      {attachments.files.map((file) => (
        <span key={file.id} className="flex max-w-[180px] items-center gap-2 rounded-md border bg-muted/50 py-1 pl-1 pr-2 text-xs">
          {file.mediaType?.startsWith("image/") ? <img src={file.url} alt="" className="h-7 w-7 rounded object-cover" /> : <FileText className="h-5 w-5 shrink-0 text-primary" />}
          <span className="truncate">{file.filename}</span>
          <button type="button" onClick={() => attachments.remove(file.id)} aria-label={`Remover ${file.filename}`} className="text-muted-foreground hover:text-foreground"><X className="h-3.5 w-3.5" /></button>
        </span>
      ))}
    </PromptInputHeader>
  );
}

function AttachButton({ disabled }: { disabled: boolean }) {
  const attachments = usePromptInputAttachments();
  return <PromptInputButton disabled={disabled} onClick={() => attachments.openFileDialog()} aria-label="Anexar foto ou PDF" tooltip="Anexar foto ou PDF"><Paperclip /></PromptInputButton>;
}

const confirmWords = /^(sim|confirmo|confirmar|pode|ok|pode fazer|isso)[.! ]*$/i;

export function LebreAssistant({ slug }: { slug?: string }) {
  const askPublic = useServerFn(askPublicLebre);
  const askRestaurant = useServerFn(askRestaurantLebre);
  const execute = useServerFn(executeLebreProposal);
  const transcribe = useServerFn(transcribeLebreAudio);
  const [draft, setDraft] = useState("");
  const [recording, setRecording] = useState(false);
  const [transcribing, setTranscribing] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const timerRef = useRef<number | null>(null);

  async function startRecording() {
    setNotice(null);
    if (!navigator.mediaDevices?.getUserMedia || typeof MediaRecorder === "undefined") { setNotice("Seu navegador não permite gravar áudio aqui."); return; }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mimeType = ["audio/webm;codecs=opus", "audio/webm", "audio/mp4", "audio/ogg"].find((type) => MediaRecorder.isTypeSupported(type));
      const recorder = new MediaRecorder(stream, mimeType ? { mimeType } : undefined);
      const chunks: Blob[] = [];
      recorder.ondataavailable = (event) => { if (event.data.size) chunks.push(event.data); };
      recorder.onstop = async () => {
        stream.getTracks().forEach((track) => track.stop());
        if (timerRef.current) window.clearTimeout(timerRef.current);
        setRecording(false);
        const blob = new Blob(chunks, { type: recorder.mimeType || mimeType || "audio/webm" });
        if (blob.size < 1500) { setNotice("O áudio ficou curto demais. Segure um pouco mais."); return; }
        setTranscribing(true);
        try {
          const { text } = await transcribe({ data: { mediaType: blob.type, base64: await blobToBase64(blob) } });
          setDraft((current) => (current ? `${current} ${text}` : text).slice(0, 600));
        } catch (error) { setNotice((error as Error).message); }
        finally { setTranscribing(false); }
      };
      recorderRef.current = recorder;
      recorder.start();
      setRecording(true);
      timerRef.current = window.setTimeout(() => recorder.state === "recording" && recorder.stop(), MAX_AUDIO_MS);
    } catch { setNotice("Permita o uso do microfone para falar com a Lebre."); }
  }

  function stopRecording() { if (recorderRef.current?.state === "recording") recorderRef.current.stop(); }
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const suggestions = slug ? panelSuggestions : publicSuggestions;

  async function send(text: string, rawFiles: PromptInputMessage["files"] = []) {
    const files: LebreFile[] = rawFiles.filter((f) => f.url?.startsWith("data:") && f.mediaType).map((f) => ({ name: f.filename || "anexo", mediaType: f.mediaType, url: f.url })).map((f) => ({ name: f.name, mediaType: f.mediaType, dataUrl: f.url }));
    const question = text.trim() || (files.length ? "Veja o anexo e me ajude com ele." : "");
    if (question.length < 2 || busy || recording || transcribing) return;
    setDraft("");
    setNotice(null);
    const pendingProposal = [...messages].reverse().find((m) => m.role === "assistant" && m.proposal && !m.result && !m.error);
    if (slug && !files.length && pendingProposal?.proposal && confirmWords.test(question)) {
      setMessages((current) => [...current, { id: crypto.randomUUID(), role: "user", text: question }]);
      await confirm(pendingProposal.id, pendingProposal.proposal);
      return;
    }
    const history = messages.slice(-8).map((m) => ({ role: m.role, text: (m.text + (m.result ? ` (${m.result})` : "")).slice(0, 2000) }));
    const user: ChatMessage = { id: crypto.randomUUID(), role: "user", text: question, ...(files.length ? { files: files.map((f) => ({ name: f.name, mediaType: f.mediaType, url: f.dataUrl })) } : {}) };
    setMessages((current) => [...current, user]);
    setBusy(true);
    try {
      const reply = slug ? await askRestaurant({ data: { slug, question, history, ...(files.length ? { files } : {}) } }) : await askPublic({ data: { question, ...(files.length ? { files } : {}) } });
      const assistant: ChatMessage = { id: crypto.randomUUID(), role: "assistant", text: reply.answer, ...(reply.proposal ? { proposal: reply.proposal } : {}) };
      setMessages((current) => [...current, assistant]);
    } catch (error) {
      setMessages((current) => [...current, { id: crypto.randomUUID(), role: "assistant", text: (error as Error).message }]);
    } finally { setBusy(false); }
  }

  async function confirm(messageId: string, proposal: LebreProposal) {
    if (!slug) return;
    setBusy(true);
    try {
      const result = await execute({ data: { slug, proposalId: proposal.id, payload: proposal.payload } });
      setMessages((current) => current.map((message) => message.id === messageId ? { ...message, result: result.message } : message));
    } catch (error) {
      setMessages((current) => current.map((message) => message.id === messageId ? { ...message, error: (error as Error).message } : message));
    } finally { setBusy(false); }
  }

  return (
    <>
      <Button type="button" size="icon" onClick={() => setOpen(true)} className={`fixed right-3 z-40 rounded-full shadow-xl print:hidden sm:right-5 ${slug ? "bottom-24 h-12 w-12 lg:bottom-5 lg:h-14 lg:w-14" : "bottom-5 h-14 w-14"}`} aria-label="Conversar com a Lebre">
        <MessageCircle className="h-6 w-6" />
      </Button>
      {open && (
        <section className={`fixed inset-x-3 z-50 flex flex-col overflow-hidden rounded-lg border bg-card shadow-2xl sm:left-auto sm:right-5 sm:w-[420px] ${slug ? "bottom-24 h-[min(680px,calc(100dvh-7rem))] lg:bottom-3 lg:h-[min(720px,calc(100dvh-1.5rem))]" : "bottom-3 h-[min(720px,calc(100dvh-1.5rem))]"}`} aria-label="Conversa com a Lebre">
          <header className="flex items-center gap-3 bg-secondary px-4 py-3 text-secondary-foreground">
            <div className="h-12 w-12 overflow-hidden rounded-full bg-background p-1"><img src={lebre} alt="Lebre da TIPE" width={3584} height={4800} className="h-full w-full object-contain" /></div>
            <div className="min-w-0 flex-1"><h2 className="font-display font-bold">Lebre</h2><p className="text-xs opacity-75">Especialista TIPE</p></div>
            <Button type="button" size="icon" variant="ghost" onClick={() => setOpen(false)} className="text-secondary-foreground" aria-label="Fechar conversa"><X /></Button>
          </header>
          <Conversation className="min-h-0">
            <ConversationContent className="gap-5">
              {messages.length === 0 && (
                slug ? (
                  <div className="py-3"><p className="font-display font-semibold">Oi! Posso fazer por você:</p>
                    <div className="mt-3 grid grid-cols-2 gap-2">{panelExamples.map((ex) => <div key={ex.title} className="rounded-md border bg-muted/40 p-3"><p className="text-sm font-semibold">{ex.title}</p><p className="mt-1 text-xs text-muted-foreground">{ex.text}</p></div>)}</div>
                    <p className="mt-3 text-xs text-muted-foreground">Toque num exemplo abaixo ou escreva do seu jeito. Toda alteração pede sua confirmação.</p></div>
                ) : (
                <div className="py-5 text-center"><HareOutline className="mx-auto h-9 w-7 text-primary" /><p className="mt-3 font-display font-semibold">Como posso ajudar?</p><p className="mt-1 text-sm text-muted-foreground">Pergunte sobre a TIPE ou sobre a operação do seu restaurante.</p></div>)
              )}
              {messages.map((message) => (
                <Message key={message.id} from={message.role}>
                  <MessageContent>
                    {message.files && <div className="flex flex-wrap gap-2">{message.files.map((file, index) => file.mediaType.startsWith("image/") ? <img key={index} src={file.url} alt={file.name} className="max-h-40 rounded-md object-cover" /> : <span key={index} className="flex items-center gap-1.5 rounded-md bg-background/20 px-2 py-1 text-xs"><FileText className="h-4 w-4" />{file.name}</span>)}</div>}
                    <MessageResponse>{message.text}</MessageResponse>
                  </MessageContent>
                  {message.proposal && (
                    <Tool defaultOpen={false}>
                      <ToolHeader type="dynamic-tool" toolName="ação-segura" state={message.result ? "output-available" : message.error ? "output-error" : "approval-requested"} title={message.proposal.title} />
                      <ToolContent>
                                                <ToolInput input={message.proposal.payload} />
                        {(message.result || message.error) && <ToolOutput output={message.result} errorText={message.error} />}
                      </ToolContent>
                    </Tool>
                  )}
                  {message.proposal && (
                    <div className="rounded-md border bg-muted/40 p-3 text-sm">
                      <p className="font-semibold">{message.proposal.title}</p>
                      <p className="mt-1 text-muted-foreground">{message.proposal.summary}</p>
                      {message.result ? <p className="mt-2 font-medium text-primary">{message.result}</p> : message.error ? <p className="mt-2 text-destructive">{message.error}</p> : (
                        <div className="mt-3 flex gap-2"><Button size="sm" disabled={busy} onClick={() => confirm(message.id, message.proposal as LebreProposal)}><Check />Confirmar</Button><Button size="sm" variant="outline" onClick={() => setMessages((current) => current.map((item) => item.id === message.id ? { ...item, error: "Ação cancelada por você." } : item))}>Cancelar</Button></div>
                      )}
                    </div>
                  )}
                </Message>
              ))}
              {busy && <Message from="assistant"><MessageContent><span className="text-sm text-muted-foreground">A Lebre está pensando...</span></MessageContent></Message>}
            </ConversationContent>
            <ConversationScrollButton />
          </Conversation>
          {messages.length === 0 && <div className="flex gap-2 overflow-x-auto px-3 pb-2">{suggestions.map((suggestion) => <Button key={suggestion} type="button" size="sm" variant="outline" className="shrink-0" onClick={() => void send(suggestion)}>{suggestion}</Button>)}</div>}
          {notice && <p role="status" className="mx-3 mb-2 rounded-md bg-muted px-3 py-2 text-xs text-muted-foreground">{notice}</p>}
          <TooltipProvider delayDuration={300}>
          <PromptInput className="m-3 mt-0" accept={ACCEPT} multiple maxFiles={3} maxFileSize={MAX_FILE} onError={(error) => setNotice(error.code === "max_file_size" ? "Cada anexo pode ter até 5 MB." : error.code === "max_files" ? "Envie no máximo 3 anexos por vez." : "Envie fotos (JPG, PNG, WEBP) ou PDF.")} onSubmit={({ text, files }) => send(text, files)}>
            <AttachmentChips />
            <PromptInputBody><PromptInputTextarea value={draft} onChange={(event) => setDraft(event.currentTarget.value)} disabled={busy || transcribing} placeholder={recording ? "Ouvindo... toque no quadrado para parar" : transcribing ? "Transcrevendo seu áudio..." : "Pergunte, fale ou anexe"} /></PromptInputBody>
            <PromptInputFooter>
              <PromptInputTools>
                <AttachButton disabled={busy || recording} />
                <PromptInputButton disabled={busy || transcribing} onClick={recording ? stopRecording : () => void startRecording()} aria-label={recording ? "Parar gravação" : "Falar com a Lebre"} tooltip={recording ? "Parar gravação" : "Falar"} className={recording ? "animate-pulse text-destructive" : ""}>
                  {transcribing ? <Loader2 className="animate-spin" /> : recording ? <Square className="fill-current" /> : <Mic />}
                </PromptInputButton>
                <span className="hidden text-xs text-muted-foreground sm:inline">Ações pedem confirmação</span>
              </PromptInputTools>
              <PromptInputSubmit disabled={busy || recording || transcribing} status={busy ? "submitted" : "ready"} />
            </PromptInputFooter>
          </PromptInput>
          </TooltipProvider>
        </section>
      )}
    </>
  );
}