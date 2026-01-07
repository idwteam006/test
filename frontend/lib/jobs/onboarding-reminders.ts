/**
 * Background Job: Onboarding Reminders
 *
 * NOTE: BullMQ requires a persistent worker process and is NOT compatible
 * with Vercel's serverless environment.
 *
 * Alternative solutions for production:
 * 1. Use Vercel Cron + API endpoint (recommended for Vercel)
 * 2. Deploy separate worker on Railway/Render
 * 3. Use serverless queue service (Inngest, QStash, etc.)
 *
 * This file provides stub implementations that can be safely imported
 * without causing build errors.
 */

/**
 * Schedule reminder for an onboarding invite
 *
 * STUB IMPLEMENTATION - Replace with actual implementation when worker is set up
 */
export async function scheduleOnboardingReminder(inviteId: string) {
  console.log(`[Reminder] Scheduling disabled - BullMQ not available in serverless: ${inviteId}`);
  return false;
}

/**
 * Cancel reminder for an onboarding invite
 *
 * STUB IMPLEMENTATION - Replace with actual implementation when worker is set up
 */
export async function cancelOnboardingReminder(inviteId: string) {
  console.log(`[Reminder] Cancelling disabled - BullMQ not available in serverless: ${inviteId}`);
  return false;
}

/**
 * Check for pending onboarding and send reminders
 *
 * STUB IMPLEMENTATION - This should be called from a Vercel Cron endpoint
 * Example: Create /api/cron/check-pending-onboarding/route.ts
 */
export async function checkPendingOnboarding() {
  console.log('[Reminder] Check disabled - BullMQ not available in serverless');
  return { success: false, error: 'Not implemented in serverless environment' };
}

// Export placeholder queue for any imports that reference it
export const onboardingReminderQueue = null;
export const onboardingReminderWorker = null;
