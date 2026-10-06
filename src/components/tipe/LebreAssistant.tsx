import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { Bot, Check, MessageCircle, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Conversation, ConversationContent, ConversationScrollButton } from "@/components/ai-elements/conversation";
import { Message, MessageContent, MessageResponse } from "@/components/ai-elements/message";
import { PromptInput, PromptInputBody, PromptInputFooter, PromptInputSubmit, PromptInputTextarea } from "@/components/ai-elements/prompt-input";
import { Tool, ToolContent, ToolHeader, ToolInput, ToolOutput } from "@/components/ai-elements/tool";
import { askPublicLebre, askRestaurantLebre, executeLebreProposal, type LebreProposal } from "@/lib/tipe/lebre.functions";
import lebre from "@/assets/lebre-ai-official.png";

type ChatMessage = { id: string; role: "user" | "assistant"; text: string; proposal?: LebreProposal; result?: string; error?: string };

const publicSuggestions = ["Como a TIPE funciona?", "Preciso trocar meu PDV?", "Como são os 30 dias grátis?"];
const panelSuggestions = ["Resuma a situação do salão", "Como confirmo um pagamento?", "Quero cadastrar a mesa 21"];

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
    const user: ChatMessage = { id: crypto.randomUUID(), role: "user", text: question };
    setMessages((current) => [...current, user]);
    setBusy(true);
    try {
      const reply = slug ? await askRestaurant({ data: { slug, question } }) : await askPublic({ data: { question } });
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
      const result = await execute({ data: { slug, proposalId: proposal.id, action: proposal.action, number: proposal.payload.number } });
      setMessages((current) => current.map((message) => message.id === messageId ? { ...message, result: result.message } : message));
    } catch (error) {
      setMessages((current) => current.map((message) => message.id === messageId ? { ...message, error: (error as Error).message } : message));
    } finally { setBusy(false); }
  }

  return (
    <>
      <Button type="button" size="icon" onClick={() => setOpen(true)} className="fixed bottom-5 right-5 z-40 h-14 w-14 rounded-full shadow-xl print:hidden" aria-label="Conversar com a Lebre">
        <MessageCircle className="h-6 w-6" />
      </Button>
      {open && (
        <section className="fixed inset-x-3 bottom-3 z-50 flex h-[min(720px,calc(100vh-1.5rem))] flex-col overflow-hidden rounded-lg border bg-card shadow-2xl sm:left-auto sm:right-5 sm:w-[420px]" aria-label="Conversa com a Lebre">
          <header className="flex items-center gap-3 bg-secondary px-4 py-3 text-secondary-foreground">
            <div className="h-12 w-12 overflow-hidden rounded-full bg-background p-1"><img src={lebre} alt="Lebre da TIPE" width={3584} height={4800} className="h-full w-full object-contain" /></div>
            <div className="min-w-0 flex-1"><h2 className="font-display font-bold">Lebre</h2><p className="text-xs opacity-75">Especialista TIPE</p></div>
            <Button type="button" size="icon" variant="ghost" onClick={() => setOpen(false)} className="text-secondary-foreground" aria-label="Fechar conversa"><X /></Button>
          </header>
          <Conversation className="min-h-0">
            <ConversationContent className="gap-5">
              {messages.length === 0 && (
                <div className="py-5 text-center"><Bot className="mx-auto h-7 w-7 text-primary" /><p className="mt-3 font-display font-semibold">Como posso ajudar?</p><p className="mt-1 text-sm text-muted-foreground">Pergunte sobre a TIPE ou sobre a operação do seu restaurante.</p></div>
              )}
              {messages.map((message) => (
                <Message key={message.id} from={message.role}>
                  <MessageContent><MessageResponse>{message.text}</MessageResponse></MessageContent>
                  {message.proposal && (
                    <Tool defaultOpen={false}>
                      <ToolHeader type="dynamic-tool" toolName="ação-segura" state={message.result ? "output-available" : message.error ? "output-error" : "approval-requested"} title={message.proposal.title} />
                      <ToolContent>
                        <p className="text-sm">{message.proposal.summary}</p>
                        <ToolInput input={message.proposal.payload} />
                        {(message.result || message.error) ? <ToolOutput output={message.result} errorText={message.error} /> : (
                          <div className="flex gap-2"><Button disabled={busy} onClick={() => confirm(message.id, message.proposal as LebreProposal)}><Check />Confirmar</Button><Button variant="outline" onClick={() => setMessages((current) => current.map((item) => item.id === message.id ? { ...item, error: "Ação cancelada por você." } : item))}>Cancelar</Button></div>
                        )}
                      </ToolContent>
                    </Tool>
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