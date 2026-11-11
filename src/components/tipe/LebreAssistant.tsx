import { useEffect, useRef, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import {
  ArrowUpRight,
  Check,
  FileText,
  LayoutGrid,
  Loader2,
  Mic,
  Paperclip,
  RotateCcw,
  Square,
  Table2,
  UtensilsCrossed,
  Users,
  X,
  Zap,
} from "lucide-react";
import { VoiceWave } from "@/components/tipe/VoiceWave";
import { classeBotaoLebre, ConteudoBotaoLebre } from "@/components/tipe/LebreBotao";
import { LebreTexto } from "@/components/tipe/LebreTexto";
import { TooltipProvider } from "@/components/ui/tooltip";
import {
  Conversation,
  ConversationContent,
  ConversationScrollButton,
} from "@/components/ai-elements/conversation";
import {
  PromptInput,
  PromptInputBody,
  PromptInputButton,
  PromptInputFooter,
  PromptInputHeader,
  PromptInputSubmit,
  PromptInputTextarea,
  PromptInputTools,
  usePromptInputAttachments,
  type PromptInputMessage,
} from "@/components/ai-elements/prompt-input";
import {
  askPublicLebre,
  askRestaurantLebre,
  executeLebreProposal,
  transcribeLebreAudio,
  type LebreFile,
  type LebreProposal,
} from "@/lib/tipe/lebre.functions";
import lebre from "@/assets/lebre/avatar-feliz.webp";
import lebreOla from "@/assets/lebre/avatar-ola.webp";
import { cn } from "@/lib/utils";

type ChatMessage = {
  id: string;
  role: "user" | "assistant";
  text: string;
  files?: { name: string; mediaType: string; url: string }[];
  proposal?: LebreProposal;
  result?: string;
  error?: string;
  /** Tempo da resposta, em milissegundos. */
  ms?: number;
};

const publicSuggestions = [
  { titulo: "Como a Tipe funciona?", texto: "Em 20 segundos" },
  { titulo: "Funciona com o meu PDV?", texto: "Ou uso o da Tipe" },
  { titulo: "Quais são os produtos?", texto: "Pay, Order, Kitchen..." },
  { titulo: "Como são os 30 dias grátis?", texto: "Sem cartão" },
];
const panelSuggestions = [
  { icone: LayoutGrid, titulo: "Resumo do salão", pergunta: "Resuma a situação do salão agora" },
  { icone: Table2, titulo: "Mesas", pergunta: "Abrir a mesa 5" },
  {
    icone: Users,
    titulo: "Lançar pedido",
    pergunta: "Lança 2 chopp e 1 picanha na mesa 5",
  },
  { icone: UtensilsCrossed, titulo: "Cardápio", pergunta: "Pausar o item Suco de laranja" },
];
const PENSANDO_PUBLICO = ["Farejando a resposta", "Correndo atrás", "Quase lá"];
const PENSANDO_PAINEL = ["Olhando o salão", "Conferindo as mesas", "Quase lá"];

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

const segundos = (ms: number) =>
  ms < 1000
    ? "em menos de 1 s"
    : `em ${(ms / 1000).toLocaleString("pt-BR", { maximumFractionDigits: 1 })} s`;

function AttachmentChips() {
  const attachments = usePromptInputAttachments();
  if (!attachments.files.length) return null;
  return (
    <PromptInputHeader className="flex flex-wrap gap-2 px-3 pt-3">
      {attachments.files.map((file) => (
        <span
          key={file.id}
          className="flex max-w-[180px] items-center gap-2 rounded-full border bg-ink/5 py-1 pl-1 pr-2 text-xs"
        >
          {file.mediaType?.startsWith("image/") ? (
            <img src={file.url} alt="" className="h-7 w-7 rounded-full object-cover" />
          ) : (
            <FileText className="ml-1 h-4 w-4 shrink-0 text-brand-strong" />
          )}
          <span className="truncate">{file.filename}</span>
          <button
            type="button"
            onClick={() => attachments.remove(file.id)}
            aria-label={`Remover ${file.filename}`}
            className="grid h-6 w-6 place-items-center rounded-full text-ink/60 hover:bg-white hover:text-ink"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </span>
      ))}
    </PromptInputHeader>
  );
}

function AttachButton({ disabled }: { disabled: boolean }) {
  const attachments = usePromptInputAttachments();
  return (
    <PromptInputButton
      disabled={disabled}
      onClick={() => attachments.openFileDialog()}
      aria-label="Anexar foto ou PDF"
      tooltip="Anexar foto ou PDF"
    >
      <Paperclip />
    </PromptInputButton>
  );
}

/** Indicador de "pensando": três passos de lebre e uma frase que troca rápido. */
function Pensando({ painel }: { painel: boolean }) {
  const frases = painel ? PENSANDO_PAINEL : PENSANDO_PUBLICO;
  const [i, setI] = useState(0);
  useEffect(() => {
    const t = window.setInterval(() => setI((v) => Math.min(v + 1, frases.length - 1)), 1100);
    return () => window.clearInterval(t);
  }, [frases.length]);
  return (
    <div className="flex items-center gap-3 text-sm text-ink/60" role="status" aria-live="polite">
      <span className="lebre-passos flex gap-1" aria-hidden>
        <span />
        <span />
        <span />
      </span>
      <span key={i} className="lebre-entra">
        {frases[i]}...
      </span>
    </div>
  );
}

const confirmWords = /^(sim|confirmo|confirmar|pode|ok|pode fazer|isso)[.! ]*$/i;

export function LebreAssistant({
  slug,
  inicialAberta = false,
}: {
  slug?: string | undefined;
  inicialAberta?: boolean;
}) {
  const askPublic = useServerFn(askPublicLebre);
  const askRestaurant = useServerFn(askRestaurantLebre);
  const execute = useServerFn(executeLebreProposal);
  const transcribe = useServerFn(transcribeLebreAudio);
  const [draft, setDraft] = useState("");
  const [recording, setRecording] = useState(false);
  const [micStream, setMicStream] = useState<MediaStream | null>(null);
  const [transcribing, setTranscribing] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [open, setOpen] = useState(inicialAberta);
  const [busy, setBusy] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const timerRef = useRef<number | null>(null);
  const painelRef = useRef<HTMLElement | null>(null);
  const botaoRef = useRef<HTMLButtonElement | null>(null);
  const painel = Boolean(slug);

  // Abre já com o cursor no campo; Esc fecha e devolve o foco ao botão.
  useEffect(() => {
    if (!open) return;
    const campo = painelRef.current?.querySelector("textarea");
    if (campo && window.matchMedia("(pointer: fine)").matches) campo.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setOpen(false);
        botaoRef.current?.focus();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  async function startRecording() {
    setNotice(null);
    if (!navigator.mediaDevices?.getUserMedia || typeof MediaRecorder === "undefined") {
      setNotice("Seu navegador não permite gravar áudio aqui.");
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mimeType = ["audio/webm;codecs=opus", "audio/webm", "audio/mp4", "audio/ogg"].find(
        (type) => MediaRecorder.isTypeSupported(type),
      );
      const recorder = new MediaRecorder(stream, mimeType ? { mimeType } : undefined);
      const chunks: Blob[] = [];
      recorder.ondataavailable = (event) => {
        if (event.data.size) chunks.push(event.data);
      };
      recorder.onstop = async () => {
        stream.getTracks().forEach((track) => track.stop());
        setMicStream(null);
        if (timerRef.current) window.clearTimeout(timerRef.current);
        setRecording(false);
        const blob = new Blob(chunks, { type: recorder.mimeType || mimeType || "audio/webm" });
        if (blob.size < 1500) {
          setNotice("O áudio ficou curto demais. Segure um pouco mais.");
          return;
        }
        setTranscribing(true);
        try {
          const { text } = await transcribe({
            data: { mediaType: blob.type, base64: await blobToBase64(blob) },
          });
          setDraft((current) => (current ? `${current} ${text}` : text).slice(0, 600));
        } catch (error) {
          setNotice((error as Error).message);
        } finally {
          setTranscribing(false);
        }
      };
      recorderRef.current = recorder;
      recorder.start();
      setMicStream(stream);
      setRecording(true);
      timerRef.current = window.setTimeout(
        () => recorder.state === "recording" && recorder.stop(),
        MAX_AUDIO_MS,
      );
    } catch {
      setNotice("Permita o uso do microfone para falar com a Lebre.");
    }
  }

  function stopRecording() {
    if (recorderRef.current?.state === "recording") recorderRef.current.stop();
  }

  async function send(text: string, rawFiles: PromptInputMessage["files"] = []) {
    const files: LebreFile[] = rawFiles
      .filter((f) => f.url?.startsWith("data:") && f.mediaType)
      .map((f) => ({ name: f.filename || "anexo", mediaType: f.mediaType, dataUrl: f.url }));
    const question = text.trim() || (files.length ? "Veja o anexo e me ajude com ele." : "");
    if (question.length < 2 || busy || recording || transcribing) return;
    setDraft("");
    setNotice(null);
    const pendingProposal = [...messages]
      .reverse()
      .find((m) => m.role === "assistant" && m.proposal && !m.result && !m.error);
    if (slug && !files.length && pendingProposal?.proposal && confirmWords.test(question)) {
      setMessages((current) => [
        ...current,
        { id: crypto.randomUUID(), role: "user", text: question },
      ]);
      await confirm(pendingProposal.id, pendingProposal.proposal);
      return;
    }
    const history = messages.slice(-8).map((m) => ({
      role: m.role,
      text: (m.text + (m.result ? ` (${m.result})` : "")).slice(0, 2000),
    }));
    const user: ChatMessage = {
      id: crypto.randomUUID(),
      role: "user",
      text: question,
      ...(files.length
        ? { files: files.map((f) => ({ name: f.name, mediaType: f.mediaType, url: f.dataUrl })) }
        : {}),
    };
    setMessages((current) => [...current, user]);
    setBusy(true);
    const inicio = performance.now();
    try {
      const reply = slug
        ? await askRestaurant({
            data: { slug, question, history, ...(files.length ? { files } : {}) },
          })
        : await askPublic({ data: { question, ...(files.length ? { files } : {}) } });
      const assistant: ChatMessage = {
        id: crypto.randomUUID(),
        role: "assistant",
        text: reply.answer,
        ms: performance.now() - inicio,
        ...(reply.proposal ? { proposal: reply.proposal } : {}),
      };
      setMessages((current) => [...current, assistant]);
    } catch (error) {
      setMessages((current) => [
        ...current,
        { id: crypto.randomUUID(), role: "assistant", text: (error as Error).message },
      ]);
    } finally {
      setBusy(false);
    }
  }

  async function confirm(messageId: string, proposal: LebreProposal) {
    if (!slug) return;
    setBusy(true);
    try {
      const result = await execute({
        data: { slug, proposalId: proposal.id, payload: proposal.payload },
      });
      setMessages((current) =>
        current.map((message) =>
          message.id === messageId ? { ...message, result: result.message } : message,
        ),
      );
    } catch (error) {
      setMessages((current) =>
        current.map((message) =>
          message.id === messageId ? { ...message, error: (error as Error).message } : message,
        ),
      );
    } finally {
      setBusy(false);
    }
  }

  const vazio = messages.length === 0;

  return (
    <>
      <button
        ref={botaoRef}
        type="button"
        onClick={() => setOpen(true)}
        className={cn(classeBotaoLebre(slug), open && "max-sm:hidden")}
        aria-label="Pergunte à Lebre"
        aria-expanded={open}
      >
        <ConteudoBotaoLebre />
      </button>
      {open && (
        <section
          ref={painelRef}
          className={cn(
            "lebre-painel fixed z-50 flex flex-col overflow-hidden bg-white text-ink",
            "inset-0 h-[100dvh] max-sm:pb-[env(safe-area-inset-bottom)]",
            "sm:inset-auto sm:right-5 sm:w-[420px] sm:rounded-[28px] sm:border sm:border-ink/10 sm:shadow-[0_24px_80px_-20px_rgb(0_0_0/0.35)]",
            painel
              ? "sm:bottom-24 sm:h-[min(700px,calc(100dvh-7rem))] lg:bottom-5 lg:h-[min(740px,calc(100dvh-2.5rem))]"
              : "sm:bottom-5 sm:h-[min(740px,calc(100dvh-2.5rem))]",
          )}
          role="dialog"
          aria-modal="false"
          aria-label="Conversa com a Lebre"
        >
          <header className="relative flex items-center gap-3 bg-ink px-4 pb-3.5 pt-[max(0.875rem,env(safe-area-inset-top))] text-white">
            <div className="relative h-11 w-11 shrink-0">
              <img
                src={lebre}
                alt=""
                width={96}
                height={96}
                className="h-11 w-11 rounded-full bg-white object-cover ring-2 ring-brand"
              />
              <span
                className="absolute -bottom-0.5 -right-0.5 h-3.5 w-3.5 rounded-full border-2 border-ink bg-brand"
                aria-hidden
              />
            </div>
            <div className="min-w-0 flex-1 leading-tight">
              <h2 className="font-display text-[1.15rem] font-semibold tracking-[-0.02em]">
                Lebre
              </h2>
              <p className="truncate text-xs text-white/65">a inteligência da Tipe</p>
            </div>
            {!vazio && (
              <button
                type="button"
                onClick={() => {
                  setMessages([]);
                  setNotice(null);
                }}
                disabled={busy}
                className="grid h-10 w-10 place-items-center rounded-full text-white/75 transition-colors hover:bg-white/10 hover:text-white disabled:opacity-40"
                aria-label="Nova conversa"
                title="Nova conversa"
              >
                <RotateCcw className="h-[18px] w-[18px]" />
              </button>
            )}
            <button
              type="button"
              onClick={() => {
                setOpen(false);
                botaoRef.current?.focus();
              }}
              className="grid h-10 w-10 place-items-center rounded-full text-white/75 transition-colors hover:bg-white/10 hover:text-white"
              aria-label="Fechar conversa"
            >
              <X className="h-5 w-5" />
            </button>
          </header>

          <Conversation className="min-h-0 flex-1">
            <ConversationContent className="gap-5 px-4 py-5">
              {vazio && (
                <div className="lebre-entra">
                  <div className="flex items-end gap-4">
                    <img
                      src={lebreOla}
                      alt=""
                      width={160}
                      height={160}
                      className="h-20 w-20 shrink-0 rounded-full bg-brand-soft object-cover"
                    />
                    <div className="pb-1">
                      <p className="font-display text-[1.45rem] font-semibold leading-[1.1] tracking-[-0.03em]">
                        {painel ? "Pode mandar." : "Oi, eu sou a Lebre."}
                      </p>
                      <p className="mt-1.5 text-sm text-ink/60">
                        {painel
                          ? "Eu leio o salão e faço o serviço. Você só confirma."
                          : "Pergunte rápido que eu respondo mais rápido ainda."}
                      </p>
                    </div>
                  </div>
                  <div className="mt-6 grid grid-cols-2 gap-2">
                    {painel
                      ? panelSuggestions.map(({ icone: I, titulo, pergunta }) => (
                          <button
                            key={titulo}
                            type="button"
                            onClick={() => void send(pergunta)}
                            className="group/s flex min-h-[76px] flex-col justify-between rounded-2xl border border-ink/10 bg-white p-3 text-left transition-[border-color,transform] duration-150 hover:-translate-y-0.5 hover:border-primary active:translate-y-0"
                          >
                            <I className="h-[18px] w-[18px] text-brand-strong" />
                            <span>
                              <span className="block text-sm font-semibold">{titulo}</span>
                              <span className="line-clamp-1 text-xs text-ink/60">{pergunta}</span>
                            </span>
                          </button>
                        ))
                      : publicSuggestions.map(({ titulo, texto }) => (
                          <button
                            key={titulo}
                            type="button"
                            onClick={() => void send(titulo)}
                            className="flex min-h-[76px] flex-col justify-between rounded-2xl border border-ink/10 bg-white p-3 text-left transition-[border-color,transform] duration-150 hover:-translate-y-0.5 hover:border-primary active:translate-y-0"
                          >
                            <span className="text-sm font-semibold leading-snug">{titulo}</span>
                            <span className="mt-2 flex items-center gap-1 text-xs text-ink/60">
                              {texto}
                              <ArrowUpRight className="h-3 w-3" />
                            </span>
                          </button>
                        ))}
                  </div>
                  <p className="mt-4 text-xs text-ink/60">
                    {painel
                      ? "Escreva, fale ou mande uma foto do cardápio. Nada muda sem a sua confirmação."
                      : "Escreva, fale ou mande uma foto. Respondo em segundos."}
                  </p>
                </div>
              )}

              {messages.map((message) =>
                message.role === "user" ? (
                  <div
                    key={message.id}
                    className="lebre-entra ml-auto flex max-w-[85%] flex-col items-end gap-2"
                  >
                    {message.files && (
                      <div className="flex flex-wrap justify-end gap-2">
                        {message.files.map((file, index) =>
                          file.mediaType.startsWith("image/") ? (
                            <img
                              key={index}
                              src={file.url}
                              alt={file.name}
                              className="max-h-40 rounded-2xl object-cover"
                            />
                          ) : (
                            <span
                              key={index}
                              className="flex items-center gap-1.5 rounded-full bg-ink/5 px-3 py-1 text-xs"
                            >
                              <FileText className="h-4 w-4" />
                              {file.name}
                            </span>
                          ),
                        )}
                      </div>
                    )}
                    <p className="whitespace-pre-wrap rounded-[20px] rounded-br-md bg-ink px-4 py-2.5 text-[0.95rem] leading-snug text-white">
                      {message.text}
                    </p>
                  </div>
                ) : (
                  <div key={message.id} className="lebre-entra flex max-w-full gap-2.5">
                    <img
                      src={lebre}
                      alt=""
                      width={64}
                      height={64}
                      className="mt-0.5 h-7 w-7 shrink-0 rounded-full bg-brand-soft object-cover"
                    />
                    <div className="min-w-0 flex-1">
                      <LebreTexto>{message.text}</LebreTexto>
                      {message.proposal && (
                        <div className="mt-3 overflow-hidden rounded-2xl border border-ink/10 bg-white">
                          <div className="flex items-start gap-3 p-3.5">
                            <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-brand-soft text-brand-strong">
                              <Zap className="h-4 w-4" />
                            </span>
                            <div className="min-w-0">
                              <p className="text-sm font-semibold">{message.proposal.title}</p>
                              <p className="mt-0.5 text-sm text-ink/60">
                                {message.proposal.summary}
                              </p>
                            </div>
                          </div>
                          {message.result ? (
                            <p className="flex items-center gap-2 border-t border-ink/10 bg-brand-soft px-3.5 py-2.5 text-sm font-medium text-brand-strong">
                              <Check className="h-4 w-4" />
                              {message.result}
                            </p>
                          ) : message.error ? (
                            <p className="border-t border-ink/10 px-3.5 py-2.5 text-sm text-destructive">
                              {message.error}
                            </p>
                          ) : (
                            <div className="flex gap-2 border-t border-ink/10 p-2.5">
                              <button
                                type="button"
                                disabled={busy}
                                onClick={() =>
                                  void confirm(message.id, message.proposal as LebreProposal)
                                }
                                className="flex h-10 flex-1 items-center justify-center gap-1.5 rounded-full bg-primary text-sm font-semibold text-primary-foreground transition-opacity disabled:opacity-50"
                              >
                                <Check className="h-4 w-4" />
                                Confirmar
                              </button>
                              <button
                                type="button"
                                onClick={() =>
                                  setMessages((current) =>
                                    current.map((item) =>
                                      item.id === message.id
                                        ? { ...item, error: "Ação cancelada por você." }
                                        : item,
                                    ),
                                  )
                                }
                                className="h-10 rounded-full border border-ink/10 px-4 text-sm font-medium hover:bg-ink/5"
                              >
                                Cancelar
                              </button>
                            </div>
                          )}
                        </div>
                      )}
                      {message.ms !== undefined && (
                        <p className="mt-1.5 flex items-center gap-1 text-[11px] text-ink/50">
                          <Zap className="h-3 w-3 text-brand-strong" aria-hidden />
                          Respondi {segundos(message.ms)}
                        </p>
                      )}
                    </div>
                  </div>
                ),
              )}
              {busy && <Pensando painel={painel} />}
            </ConversationContent>
            <ConversationScrollButton />
          </Conversation>

          {notice && (
            <p
              role="status"
              className="mx-3 mb-2 rounded-xl bg-ink/5 px-3 py-2 text-xs text-ink/60"
            >
              {notice}
            </p>
          )}
          <TooltipProvider delayDuration={300}>
            <PromptInput
              className="mx-3 mb-3 w-[calc(100%-1.5rem)] rounded-[22px] border-ink/10 bg-white text-ink shadow-sm focus-within:border-primary [&_button:not([type=submit])]:text-ink/70"
              accept={ACCEPT}
              multiple
              maxFiles={3}
              maxFileSize={MAX_FILE}
              onError={(error) =>
                setNotice(
                  error.code === "max_file_size"
                    ? "Cada anexo pode ter até 5 MB."
                    : error.code === "max_files"
                      ? "Envie no máximo 3 anexos por vez."
                      : "Envie fotos (JPG, PNG, WEBP) ou PDF.",
                )
              }
              onSubmit={({ text, files }) => send(text, files)}
            >
              <AttachmentChips />
              <PromptInputBody>
                <PromptInputTextarea
                  value={draft}
                  onChange={(event) => setDraft(event.currentTarget.value)}
                  disabled={busy || transcribing}
                  className="min-h-12 text-base text-ink placeholder:text-ink/45 sm:text-[0.95rem]"
                  placeholder={
                    recording
                      ? "Ouvindo... toque no quadrado para parar"
                      : transcribing
                        ? "Transcrevendo seu áudio..."
                        : "Pergunte à Lebre"
                  }
                />
              </PromptInputBody>
              <PromptInputFooter>
                <PromptInputTools className="min-w-0 flex-1">
                  <AttachButton disabled={busy || recording} />
                  <PromptInputButton
                    disabled={busy || transcribing}
                    onClick={recording ? stopRecording : () => void startRecording()}
                    aria-label={recording ? "Parar gravação" : "Falar com a Lebre"}
                    tooltip={recording ? "Parar gravação" : "Falar"}
                    className={recording ? "text-destructive" : ""}
                  >
                    {transcribing ? (
                      <Loader2 className="animate-spin" />
                    ) : recording ? (
                      <Square className="fill-current" />
                    ) : (
                      <Mic />
                    )}
                  </PromptInputButton>
                  {recording && micStream ? (
                    <VoiceWave stream={micStream} />
                  ) : (
                    painel && (
                      <span className="hidden text-xs text-ink/60 sm:inline">
                        Ações pedem confirmação
                      </span>
                    )
                  )}
                </PromptInputTools>
                <PromptInputSubmit
                  disabled={busy || recording || transcribing}
                  status={busy ? "submitted" : "ready"}
                  className="rounded-full bg-primary text-primary-foreground hover:bg-primary/90"
                />
              </PromptInputFooter>
            </PromptInput>
          </TooltipProvider>
        </section>
      )}
    </>
  );
}
