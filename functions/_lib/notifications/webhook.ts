import type { Env } from '../config/env'

export async function sendEnquiryNotification(
  env: Env,
  payload: { name: string; email: string; projectType: string },
): Promise<void> {
  if (!env.NOTIFICATION_WEBHOOK_URL) return
  try {
    await fetch(env.NOTIFICATION_WEBHOOK_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        type: 'enquiry',
        name: payload.name,
        email: payload.email,
        projectType: payload.projectType,
      }),
    })
  } catch {
    // Notification delivery is deliberately best-effort and never blocks or reverts durable storage.
  }
}
