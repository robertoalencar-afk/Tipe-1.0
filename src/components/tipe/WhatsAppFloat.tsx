import { useLocation } from "@tanstack/react-router";
import { MessageCircle } from "lucide-react";
import { WHATSAPP_SITE_MESSAGE, whatsappLink } from "@/lib/tipe/contact";

const PUBLIC = ["/", "/simulador", "/cadastro", "/entrar"];

/** Botão flutuante de WhatsApp nas páginas públicas do site. Fica acima do botão da Lebre. */
export function WhatsAppFloat() {
  const { pathname } = useLocation();
  if (!PUBLIC.includes(pathname.replace(/\/$/, "") || "/") && !pathname.startsWith("/legal")) return null;
  return (
    <a href={whatsappLink(WHATSAPP_SITE_MESSAGE)} target="_blank" rel="noopener noreferrer" aria-label="Falar com a TIPE no WhatsApp"
      className="fixed bottom-[5.5rem] right-4 z-40 grid h-12 w-12 place-items-center rounded-full bg-success text-success-foreground shadow-lg transition-transform hover:-translate-y-0.5 sm:bottom-24 sm:right-6">
      <MessageCircle className="h-6 w-6" />
    </a>
  );
}
