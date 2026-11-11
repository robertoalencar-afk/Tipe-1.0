import * as React from 'react'
import { render } from '@react-email/render'
import { TEMPLATES } from './registry'

// Server-only: reads RESEND_API_KEY. Never import from client components.

const SITE_NAME = "Tipe"
// Endereço de envio; o domínio precisa estar verificado no Resend.
const FROM_ADDRESS = process.env['EMAIL_FROM'] || 'noreply@tipe.digital'

export type SendTemplateEmailResult =
  | { sent: true }
  | { sent: false; reason: 'recipient_suppressed' }

export interface SendTemplateEmailOptions {
  templateData?: Record<string, any>
  /** Dedupes retries of the same logical send; defaults to a random UUID (no dedupe). */
  idempotencyKey?: string
  replyTo?: string
  /** Vínculos para o histórico de e-mails da Central Tipe (email_log). */
  leadId?: string | null
  restaurantId?: string | null
}

// Histórico na Central Tipe: grava o envio em email_log sem nunca bloquear o envio.
async function registrarEnvio(r: { template: string; to: string; subject: string; resendId?: string | null; status: 'sent' | 'failed' | 'suppressed'; error?: string | null; leadId?: string | null | undefined; restaurantId?: string | null | undefined }) {
  try {
    const { supabaseAdmin } = await import('@/integrations/supabase/client.server')
    await (supabaseAdmin as unknown as { from: (t: string) => any }).from('email_log').insert({
      template: r.template, to_email: r.to.toLowerCase(), subject: r.subject, resend_id: r.resendId ?? null,
      status: r.status, error: r.error ?? null, lead_id: r.leadId ?? null, restaurant_id: r.restaurantId ?? null,
    })
  } catch (e) {
    console.warn('[email_log] não gravou histórico:', (e as Error).message)
  }
}

/**
 * Renders a registered template and sends it through Resend
 * (https://resend.com/docs/api-reference/emails/send-email). A suppressed
 * recipient is an expected outcome ({ sent: false }); any other failure throws.
 */
export async function sendTemplateEmail(
  templateName: string,
  to: string,
  options: SendTemplateEmailOptions = {}
): Promise<SendTemplateEmailResult> {
  const apiKey = process.env['RESEND_API_KEY']
  if (!apiKey) {
    throw new Error('RESEND_API_KEY is not configured')
  }

  const template = TEMPLATES[templateName]
  if (!template) {
    throw new Error(
      `Template '${templateName}' not found. Available: ${Object.keys(TEMPLATES).join(', ')}`
    )
  }

  // Template-level `to` takes precedence — notification templates always
  // send to their fixed address.
  const recipient = template.to || to
  if (!recipient) {
    throw new Error('Recipient is required (the template defines no fixed recipient)')
  }

  const templateData = options.templateData ?? {}
  const element = React.createElement(template.component, templateData)
  const html = await render(element)
  const text = await render(element, { plainText: true })
  const subject =
    typeof template.subject === 'function'
      ? template.subject(templateData)
      : template.subject

  const response = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
      'Idempotency-Key': options.idempotencyKey || crypto.randomUUID(),
    },
    body: JSON.stringify({
      from: `${SITE_NAME} <${FROM_ADDRESS}>`,
      to: [recipient],
      subject,
      html,
      text,
      tags: [{ name: 'template', value: templateName.replace(/[^A-Za-z0-9_-]/g, '_') }],
      ...(options.replyTo ? { reply_to: options.replyTo } : {}),
    }),
  })
  const base = { template: templateName, to: recipient, subject, leadId: options.leadId, restaurantId: options.restaurantId }
  if (!response.ok) {
    const body = await response.text().catch(() => '')
    if (/suppress/i.test(body)) {
      await registrarEnvio({ ...base, status: 'suppressed', error: body.slice(0, 200) })
      return { sent: false, reason: 'recipient_suppressed' }
    }
    await registrarEnvio({ ...base, status: 'failed', error: `${response.status}: ${body.slice(0, 200)}` })
    throw new Error(`Falha ao enviar e-mail (${response.status}): ${body.slice(0, 200)}`)
  }
  const resendId = await response.json().then((j: { id?: string }) => j?.id ?? null).catch(() => null)
  await registrarEnvio({ ...base, status: 'sent', resendId })

  return { sent: true }
}
