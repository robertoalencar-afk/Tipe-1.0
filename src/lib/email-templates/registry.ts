import { template as leadNotification } from './lead-notification'
import { template as leadConfirmation } from './lead-confirmation'
import { template as privacyRequestNotification } from './privacy-request-notification'
import { template as securityAlert } from './security-alert'
import { template as pixChangeNotice } from './pix-change-notice'
import { template as paymentReceipt } from './payment-receipt'
import type { ComponentType } from 'react'

export interface TemplateEntry {
  component: ComponentType<any>
  subject: string | ((data: Record<string, any>) => string)
  displayName?: string
  previewData?: Record<string, any>
  /** Fixed recipient — overrides caller-provided recipientEmail when set. */
  to?: string
}

/**
 * Template registry — maps template names to their React Email components.
 * Import and register new templates here after creating them in this directory.
 *
 * Example:
 *   import { template as welcomeTemplate } from './welcome'
 *   // then add to TEMPLATES: 'welcome': welcomeTemplate
 */
export const TEMPLATES: Record<string, TemplateEntry> = {
  'lead-notification': leadNotification,
  'lead-confirmation': leadConfirmation,
  'privacy-request-notification': privacyRequestNotification,
  'security-alert': securityAlert,
  'pix-change-notice': pixChangeNotice,
  'payment-receipt': paymentReceipt,
  // Add templates here as they are created, e.g.:
  // 'welcome': welcomeTemplate,
}
