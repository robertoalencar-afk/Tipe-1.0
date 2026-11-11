import * as React from 'react'
import { render } from '@react-email/render'
import { TEMPLATES } from './registry'

// Server-only: reads RESEND_API_KEY. Never import from client components.

const SITE_NAME = "TIPE"
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
  if (!response.ok) {
    const body = await response.text().catch(() => '')
    if (/suppress/i.test(body)) return { sent: false, reason: 'recipient_suppressed' }
    throw new Error(`Falha ao enviar e-mail (${response.status}): ${body.slice(0, 200)}`)
  }

  return { sent: true }
}
