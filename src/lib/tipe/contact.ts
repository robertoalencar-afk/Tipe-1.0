// [PREENCHER] número oficial do WhatsApp da TIPE, só dígitos com DDI e DDD (ex.: "5585999999999").
// Enquanto estiver vazio, os botões de WhatsApp aparecem como "em breve".
export const WHATSAPP_NUMBER = "";

export const WHATSAPP_SITE_MESSAGE = "Olá! Vim pelo site e quero saber mais sobre a TIPE para o meu restaurante.";

export function whatsappLink(message: string, number: string = WHATSAPP_NUMBER) {
  const text = encodeURIComponent(message);
  return number ? `https://wa.me/${number}?text=${text}` : `https://wa.me/?text=${text}`;
}

export const hasWhatsapp = () => WHATSAPP_NUMBER.length >= 12;
