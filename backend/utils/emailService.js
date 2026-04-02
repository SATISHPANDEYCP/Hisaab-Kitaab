import { google } from "googleapis";
import dotenv from "dotenv";
import { readFile } from "fs/promises";
import { basename } from "path";
dotenv.config();

const getEnv = (...keys) => {
  for (const key of keys) {
    const value = process.env[key];
    if (value) {
      return value;
    }
  }
  return "";
};

const EMAIL_FROM = getEnv("EMAIL_FROM", "GMAIL_SENDER_EMAIL", "EMAIL", "EMAIL_USER");
const GMAIL_CLIENT_ID = getEnv("GMAIL_CLIENT_ID", "CLIENT_ID");
const GMAIL_CLIENT_SECRET = getEnv("GMAIL_CLIENT_SECRET", "CLIENT_SECRET");
const GMAIL_REDIRECT_URI = getEnv("GMAIL_REDIRECT_URI", "REDIRECT_URI");
const GMAIL_REFRESH_TOKEN = getEnv("GMAIL_REFRESH_TOKEN", "REFRESH_TOKEN");

const REQUIRED_GMAIL_ENV_VARS = [
  {
    names: ["GMAIL_CLIENT_ID", "CLIENT_ID"],
    value: GMAIL_CLIENT_ID,
  },
  {
    names: ["GMAIL_CLIENT_SECRET", "CLIENT_SECRET"],
    value: GMAIL_CLIENT_SECRET,
  },
  {
    names: ["GMAIL_REFRESH_TOKEN", "REFRESH_TOKEN"],
    value: GMAIL_REFRESH_TOKEN,
  },
  {
    names: ["EMAIL_FROM", "GMAIL_SENDER_EMAIL", "EMAIL", "EMAIL_USER"],
    value: EMAIL_FROM,
  },
];

const ensureEmailConfiguration = () => {
  const missing = REQUIRED_GMAIL_ENV_VARS
    .filter(({ value }) => !value)
    .map(({ names }) => names.join(" or "));

  if (missing.length > 0) {
    throw new Error(
      `Email configuration is incomplete. Missing: ${missing.join(", ")}`
    );
  }
};

const stripHtml = (html = "") =>
  html
    .replace(/<style[\s\S]*?<\/style>/gi, "")
    .replace(/<script[\s\S]*?<\/script>/gi, "")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();

const toBase64Url = (content) =>
  Buffer.from(content)
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/g, "");

const chunkBase64 = (base64) => base64.match(/.{1,76}/g)?.join("\r\n") || "";

const cleanHeaderValue = (value = "") => String(value).replace(/[\r\n]/g, " ").trim();

const getGmailClient = () => {
  ensureEmailConfiguration();

  const oauth2Client = GMAIL_REDIRECT_URI
    ? new google.auth.OAuth2(
        GMAIL_CLIENT_ID,
        GMAIL_CLIENT_SECRET,
        GMAIL_REDIRECT_URI
      )
    : new google.auth.OAuth2(GMAIL_CLIENT_ID, GMAIL_CLIENT_SECRET);

  oauth2Client.setCredentials({ refresh_token: GMAIL_REFRESH_TOKEN });

  return google.gmail({ version: "v1", auth: oauth2Client });
};

const normalizeAttachment = async (attachment, index) => {
  if (!attachment) {
    throw new Error(`Attachment at index ${index} is invalid.`);
  }

  if (attachment.path) {
    const fileContent = await readFile(attachment.path);
    return {
      filename: attachment.filename || basename(attachment.path),
      contentType: attachment.contentType || "application/octet-stream",
      content: fileContent,
    };
  }

  if (attachment.content === undefined || attachment.content === null) {
    throw new Error(`Attachment ${attachment.filename || index} has no content.`);
  }

  const contentBuffer = Buffer.isBuffer(attachment.content)
    ? attachment.content
    : Buffer.from(
        attachment.content,
        attachment.encoding === "base64" ? "base64" : "utf8"
      );

  return {
    filename: attachment.filename || `attachment-${index + 1}`,
    contentType: attachment.contentType || "application/octet-stream",
    content: contentBuffer,
  };
};

const buildRawMimeMessage = async ({
  from,
  to,
  cc,
  bcc,
  subject,
  html,
  text,
  attachments = [],
}) => {
  const normalizedSubject = cleanHeaderValue(subject);
  const normalizedFrom = cleanHeaderValue(from || EMAIL_FROM);
  const normalizedTo = cleanHeaderValue(to);
  const normalizedCc = cc ? cleanHeaderValue(cc) : "";
  const normalizedBcc = bcc ? cleanHeaderValue(bcc) : "";
  const textBody = text || stripHtml(html);

  const headers = [
    `From: ${normalizedFrom}`,
    `To: ${normalizedTo}`,
    normalizedCc ? `Cc: ${normalizedCc}` : "",
    normalizedBcc ? `Bcc: ${normalizedBcc}` : "",
    `Subject: ${normalizedSubject}`,
    "MIME-Version: 1.0",
  ].filter(Boolean);

  const normalizedAttachments = await Promise.all(
    attachments.map((attachment, index) => normalizeAttachment(attachment, index))
  );

  const alternativeBoundary = `alt_${Date.now()}_${Math.random().toString(16).slice(2)}`;

  if (normalizedAttachments.length === 0) {
    const body = [
      ...headers,
      `Content-Type: multipart/alternative; boundary="${alternativeBoundary}"`,
      "",
      `--${alternativeBoundary}`,
      'Content-Type: text/plain; charset="UTF-8"',
      "Content-Transfer-Encoding: 7bit",
      "",
      textBody,
      `--${alternativeBoundary}`,
      'Content-Type: text/html; charset="UTF-8"',
      "Content-Transfer-Encoding: 7bit",
      "",
      html,
      `--${alternativeBoundary}--`,
      "",
    ];

    return body.join("\r\n");
  }

  const mixedBoundary = `mix_${Date.now()}_${Math.random().toString(16).slice(2)}`;

  const parts = [
    ...headers,
    `Content-Type: multipart/mixed; boundary="${mixedBoundary}"`,
    "",
    `--${mixedBoundary}`,
    `Content-Type: multipart/alternative; boundary="${alternativeBoundary}"`,
    "",
    `--${alternativeBoundary}`,
    'Content-Type: text/plain; charset="UTF-8"',
    "Content-Transfer-Encoding: 7bit",
    "",
    textBody,
    `--${alternativeBoundary}`,
    'Content-Type: text/html; charset="UTF-8"',
    "Content-Transfer-Encoding: 7bit",
    "",
    html,
    `--${alternativeBoundary}--`,
    "",
  ];

  for (const attachment of normalizedAttachments) {
    parts.push(
      `--${mixedBoundary}`,
      `Content-Type: ${attachment.contentType}; name="${cleanHeaderValue(
        attachment.filename
      )}"`,
      `Content-Disposition: attachment; filename="${cleanHeaderValue(
        attachment.filename
      )}"`,
      "Content-Transfer-Encoding: base64",
      "",
      chunkBase64(attachment.content.toString("base64")),
      ""
    );
  }

  parts.push(`--${mixedBoundary}--`, "");

  return parts.join("\r\n");
};

const sendEmail = async ({ to, subject, html, text, cc, bcc, attachments }) => {
  try {
    if (!to || !subject || !html) {
      throw new Error("Email 'to', 'subject', and 'html' are required.");
    }

    const gmail = getGmailClient();
    const mimeMessage = await buildRawMimeMessage({
      from: EMAIL_FROM,
      to,
      cc,
      bcc,
      subject,
      html,
      text,
      attachments,
    });

    const raw = toBase64Url(mimeMessage);

    const response = await gmail.users.messages.send({
      userId: "me",
      requestBody: { raw },
    });

    console.log(`Email sent successfully to ${to}. Message ID: ${response.data.id}`);

    return {
      success: true,
      messageId: response.data.id,
      threadId: response.data.threadId,
    };
  } catch (error) {
    const apiMessage =
      error?.response?.data?.error?.message || error?.message || "Unknown email error";
    console.error("Failed to send email via Gmail API:", apiMessage);
    throw error;
  }
};

const getFrontendBaseUrl = (fallbackUrl = "") => {
  const frontendUrl = getEnv("FRONTEND_URL", "CLIENT_URL", "APP_URL") || fallbackUrl;
  return frontendUrl.split(",")[0].trim().replace(/\/$/, "");
};

// Generate 6-digit OTP
export const generateOTP = () => {
  return Math.floor(100000 + Math.random() * 900000).toString();
};

// Send OTP email
export const sendOTPEmail = async (email, otp, name) => {
  try {
    return await sendEmail({
      to: email,
      subject: "Verify Your Email - Hisaab Kitaab",
      html: `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; background-color: #f4f4f4; padding: 20px; }
          .container { background-color: white; padding: 30px; border-radius: 10px; max-width: 600px; margin: 0 auto; }
          .header { text-align: center; color: #4F46E5; margin-bottom: 30px; }
          .otp-box { background-color: #EEF2FF; padding: 20px; border-radius: 8px; text-align: center; margin: 20px 0; }
          .otp { font-size: 32px; font-weight: bold; color: #4F46E5; letter-spacing: 5px; }
          .footer { text-align: center; color: #666; font-size: 12px; margin-top: 30px; }
        </style>
      </head>
      <body>
        <div class="container">
          <h1 class="header">💰 Hisaab Kitaab</h1>
          <h2>Hello ${name}!</h2>
          <p>Thank you for registering with Hisaab Kitaab. Please verify your email address using the OTP below:</p>
          <div class="otp-box">
            <div class="otp">${otp}</div>
          </div>
          <p>This OTP will expire in <strong>10 minutes</strong>.</p>
          <p>If you didn't request this, please ignore this email.</p>
          <div class="footer">
            <p>© 2026 Hisaab Kitaab. All rights reserved.</p>
          </div>
        </div>
      </body>
      </html>
    `,
    });
  } catch (error) {
    console.error("Error sending OTP email:", error);
    return { success: false, error: error.message };
  }
};

// Send password reset email
export const sendPasswordResetEmail = async (email, resetToken, name, fallbackUrl = "") => {
  const frontendBaseUrl = getFrontendBaseUrl(fallbackUrl);

  if (!frontendBaseUrl) {
    console.error("Cannot send password reset email: missing FRONTEND_URL/CLIENT_URL/APP_URL");
    return {
      success: false,
      error: "Missing frontend URL configuration for password reset links.",
    };
  }

  const resetLink = `${frontendBaseUrl}/reset-password?token=${resetToken}`;

  try {
    return await sendEmail({
      to: email,
      subject: "Reset Your Password - Hisaab Kitaab",
      html: `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; background-color: #f4f4f4; padding: 20px; }
          .container { background-color: white; padding: 30px; border-radius: 10px; max-width: 600px; margin: 0 auto; }
          .header { text-align: center; color: #4F46E5; margin-bottom: 30px; }
          .button { display: inline-block; background-color: #4F46E5; color: white; padding: 15px 30px; text-decoration: none; border-radius: 8px; margin: 20px 0; }
          .footer { text-align: center; color: #666; font-size: 12px; margin-top: 30px; }
        </style>
      </head>
      <body>
        <div class="container">
          <h1 class="header">💰 Hisaab Kitaab</h1>
          <h2>Hello ${name}!</h2>
          <p>We received a request to reset your password. Click the button below to reset it:</p>
          <div style="text-align: center;">
            <a href="${resetLink}" class="button">Reset Password</a>
          </div>
          <p>Or copy and paste this link into your browser:</p>
          <p style="word-break: break-all; color: #4F46E5;">${resetLink}</p>
          <p>This link will expire in <strong>1 hour</strong>.</p>
          <p>If you didn't request this, please ignore this email and your password will remain unchanged.</p>
          <div class="footer">
            <p>© 2026 Hisaab Kitaab. All rights reserved.</p>
          </div>
        </div>
      </body>
      </html>
    `,
    });
  } catch (error) {
    console.error("Error sending password reset email:", error);
    return { success: false, error: error.message };
  }
};
