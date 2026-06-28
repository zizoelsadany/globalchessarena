import { pool } from "../config/db.js";
import { transporter, fromEmail } from "./emailService.js";

/**
 * Inserts an email into the database queue for asynchronous delivery.
 */
export async function queueEmail(toEmail, subject, html) {
  try {
    if (!toEmail) return;
    await pool.execute(
      "INSERT INTO email_queue (to_email, subject, html, status) VALUES (:toEmail, :subject, :html, 'pending')",
      { toEmail, subject, html }
    );
    console.log(`[Email Queue] Queued email to ${toEmail} with subject: "${subject}"`);
  } catch (error) {
    console.error("[Email Queue] Failed to queue email:", error);
  }
}

/**
 * Process a batch of pending emails.
 */
export async function processQueue() {
  try {
    // Retrieve next batch of up to 5 pending emails
    const [emails] = await pool.execute(
      "SELECT id, to_email, subject, html, attempts FROM email_queue WHERE status = 'pending' AND attempts < 3 ORDER BY id ASC LIMIT 5"
    );

    if (emails.length === 0) return;

    console.log(`[Email Queue] Processing ${emails.length} pending emails...`);

    for (const email of emails) {
      const nextAttempts = email.attempts + 1;

      // Update attempts count immediately
      await pool.execute(
        "UPDATE email_queue SET attempts = :nextAttempts, processed_at = UTC_TIMESTAMP() WHERE id = :id",
        { nextAttempts, id: email.id }
      );

      try {
        await transporter.sendMail({
          from: fromEmail,
          to: email.to_email,
          subject: email.subject,
          html: email.html
        });

        // Mark as sent
        await pool.execute(
          "UPDATE email_queue SET status = 'sent' WHERE id = :id",
          { id: email.id }
        );
        console.log(`[Email Queue] Successfully sent email to ${email.to_email} (ID: ${email.id})`);
      } catch (sendError) {
        console.error(`[Email Queue] Failed to send email to ${email.to_email} (Attempt ${nextAttempts}):`, sendError);

        const isFailed = nextAttempts >= 3;
        await pool.execute(
          "UPDATE email_queue SET status = :status, error_message = :error WHERE id = :id",
          {
            status: isFailed ? "failed" : "pending",
            error: sendError.message || "Unknown error",
            id: email.id
          }
        );
      }
    }
  } catch (error) {
    console.error("[Email Queue] Error during queue processing:", error);
  }
}

/**
 * Starts the email queue background worker.
 */
export function startEmailQueueWorker() {
  console.log("[Email Queue] Worker initialized and running every 10 seconds.");
  // Run once immediately on startup
  setTimeout(processQueue, 3000);
  setInterval(processQueue, 10000);
}
