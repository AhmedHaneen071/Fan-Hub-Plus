// ---------------------------------------------------------------------------
// Mail transport.
//
// Password-reset email is the only message this app sends, so the surface is
// deliberately tiny: configure a transport, send one templated message.
//
// Behaviour depends on the environment:
//   - SMTP configured  -> real email is sent through Nodemailer.
//   - SMTP missing      -> the caller is told the send FAILED. Reset links are
//                          never written to server logs.
//   - development       -> the message body is also returned to the caller so
//                          the "forgot password" screen can show the link, which
//                          keeps the flow demoable without a mail account.
//
// If a send fails in production the reset token has already been written to the
// database, so the user can still request a new link; nothing is silently lost.
// ---------------------------------------------------------------------------

import nodemailer from "nodemailer";
import type { Transporter } from "nodemailer";

type SendMailResult = { ok: true; preview: string } | { ok: false; error: string };

type SmtpConfig = {
  host: string;
  port: number;
  user: string;
  pass: string;
  from: string;
};

/**
 * Reads SMTP settings from the environment. Returns null when they are not
 * fully configured, which means that reset-email delivery is unavailable.
 */
function readSmtpConfig(): SmtpConfig | null {
  const host = process.env.SMTP_HOST?.trim();
  const user = process.env.SMTP_USER?.trim();
  const pass = process.env.SMTP_PASS?.trim();
  const port = Number(process.env.SMTP_PORT ?? 587);

  if (!host || !user || !pass) return null;
  if (!Number.isFinite(port) || port <= 0) return null;

  return {
    host,
    port,
    user,
    pass,
    from: process.env.MAIL_FROM?.trim() || user,
  };
}

// Reused across calls so nodemailer keeps its connection pool instead of
// re-handshaking with the mail server on every password reset.
const globalForMail = globalThis as unknown as {
  mailTransporter: Transporter | null | undefined;
};

function getTransporter(config: SmtpConfig): Transporter {
  if (globalForMail.mailTransporter) return globalForMail.mailTransporter;

  const transporter = nodemailer.createTransport({
    host: config.host,
    port: config.port,
    // Port 465 is implicit TLS; 587 and friends are opportunistic TLS. Getting
    // this wrong makes the server drop the connection after the handshake.
    secure: config.port === 465,
    requireTLS: config.port !== 465,
    auth: { user: config.user, pass: config.pass },
  });

  globalForMail.mailTransporter = transporter;
  return transporter;
}

/**
 * Sends the password reset email. Returns the rendered body so screens can
 * show a preview during development only.
 */
export async function sendPasswordResetEmail(
  to: string,
  resetUrl: string
): Promise<SendMailResult> {
  const subject = "Reset your Fan Hub Plus password";
  const body = `Hello! A password reset was requested for ${to}.\n\nOpen the link below to choose a new password. It expires in 30 minutes.\n\n${resetUrl}\n\nIf you did not request this, you can safely ignore this email.`;
  const text = body.replace(/\n/g, "\r\n");

  const config = readSmtpConfig();

  if (!config) {
    // No transport configured. Never claim the email went out or expose the
    // reset token in logs. Tokens can grant full account access until expiry.
    console.warn(
      "[mail] SMTP is not configured (SMTP_HOST / SMTP_USER / SMTP_PASS). " +
        "Password-reset email delivery is unavailable."
    );

    return {
      ok: false,
      error:
        "Email delivery is not configured on this server, so the reset link could not be sent. Contact an administrator to configure email.",
    };
  }

  try {
    await getTransporter(config).sendMail({
      from: config.from,
      to,
      subject,
      text,
    });

    return {
      ok: true,
      // Only development ever displays this.
      preview: process.env.NODE_ENV === "development" ? body : "",
    };
  } catch (error) {
    const reason = error instanceof Error ? error.message : "unknown error";
    console.error(`[mail] Failed to send the reset email to ${to}: ${reason}`);

    return {
      ok: false,
      error:
        "The reset email could not be sent. Please try again in a few minutes.",
    };
  }
}
