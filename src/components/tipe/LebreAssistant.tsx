import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { Bot, Check, MessageCircle, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Conversation, ConversationContent, ConversationScrollButton } from "@/components/ai-elements/conversation";
import { Message, MessageContent, MessageResponse } from "@/components/ai-elements/message";
import { PromptInput, PromptInputBody, PromptInputFooter, PromptInputSubmit, PromptInputTextarea } from "@/components/ai-elements/prompt-input";
import { Tool, ToolContent, ToolHeader, ToolInput, ToolOutput } from "@/components/ai-elements/tool";
import { askPublicLebre, askRestaurantLebre, executeLebreProposal, type LebreProposal } from "@/lib/tipe/lebre.functions";
import lebre from "@/assets/lebre-ai-official.svg";

type ChatMessage = { id: string; role: "user" | "assistant"; text: string; proposal?: LebreProposal; result?: string; error?: string };

const publicSuggestions = ["Como a TIPE funciona?", "Preciso trocar meu PDV?", "Como são os 30 dias grátis?"];
const panelSuggestions = ["Abrir a mesa 5", "Cadastrar a mesa 21", "Cadastrar o garçom João Mendes, e-mail joao@email.com", "Pausar o item Suco de laranja", "Resuma a situação do salão"];
const panelExamples = [
  { title: "Mesas", text: "Cadastrar, abrir ou desativar mesas" },
  { title: "Equipe", text: "Cadastrar garçom e enviar convite por e-mail" },
  { title: "Cardápio", text: "Pausar ou reativar itens" },
  { title: "Salão", text: "Resumo de mesas e pagamentos pendentes" },
];
const confirmWords = /^(sim|confirmo|confirmar|pode|ok|pode fazer|isso)[.! ]*$/i;

export function LebreAssistant({ slug }: { slug?: string }) {
  const askPublic = useServerFn(askPublicLebre);
  const askRestaurant = useServerFn(askRestaurantLebre);
  const execute = useServerFn(executeLebreProposal);
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const suggestions = slug ? panelSuggestions : publicSuggestions;

  async function send(text: string) {
    const question = text.trim();
    if (!question || busy) return;
    const pendingProposal = [...messages].reverse().find((m) => m.role === "assistant" && m.proposal && !m.result && !m.error);
    if (slug && pendingProposal?.proposal && confirmWords.test(question)) {
      setMessages((current) => [...current, { id: crypto.randomUUID(), role: "user", text: question }]);
      await confirm(pendingProposal.id, pendingProposal.proposal);
      return;
    }
    const history = messages.slice(-8).map((m) => ({ role: m.role, text: (m.text + (m.result ? ` (${m.result})` : "")).slice(0, 2000) }));
    const user: ChatMessage = { id: crypto.randomUUID(), role: "user", text: question };
    setMessages((current) => [...current, user]);
    setBusy(true);
    try {
      const reply = slug ? await askRestaurant({ data: { slug, question, history } }) : await askPublic({ data: { question } });
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
                <div className="py-5 text-center"><Bot className="mx-auto h-7 w-7 text-primary" /><p className="mt-3 font-display font-semibold">Como posso ajudar?</p><p className="mt-1 text-sm text-muted-foreground">Pergunte sobre a TIPE ou sobre a operação do seu restaurante.</p></div>)
              )}
              {messages.map((message) => (
                <Message key={message.id} from={message.role}>
                  <MessageContent><MessageResponse>{message.text}</MessageResponse></MessageContent>
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
          <PromptInput className="m-3 mt-0" onSubmit={({ text }) => send(text)}>
            <PromptInputBody><PromptInputTextarea disabled={busy} placeholder="Pergunte à Lebre" /></PromptInputBody>
            <PromptInputFooter><span className="text-xs text-muted-foreground">Ações sempre pedem confirmação</span><PromptInputSubmit disabled={busy} status={busy ? "submitted" : "ready"} /></PromptInputFooter>
          </PromptInput>
        </section>
      )}
    </>
  );
}