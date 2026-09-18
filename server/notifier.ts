import nodemailer from "nodemailer";
import crypto from "crypto";

export interface SmtpSettings {
  host: string;
  port: number;
  secure: boolean;
  username?: string;
  password?: string;
  fromAddress: string;
  recipients: string[];
  enabled: boolean;
}

export interface WebhookSettings {
  url: string;
  secretKey?: string;
  enabled: boolean;
  retries: number;
}

// In-memory or persisted settings cache
let currentSmtpSettings: SmtpSettings = {
  host: process.env.SMTP_HOST || "smtp.mailtrap.io",
  port: Number(process.env.SMTP_PORT) || 587,
  secure: false,
  username: process.env.SMTP_USER || "",
  password: process.env.SMTP_PASSWORD || "",
  fromAddress: process.env.SMTP_FROM || "alerts@blogspy.ai",
  recipients: ["intel-team@mycompany.com"],
  enabled: false
};

let currentWebhookSettings: WebhookSettings = {
  url: "",
  secretKey: "",
  enabled: false,
  retries: 3
};

export function getSmtpSettings(): SmtpSettings {
  return currentSmtpSettings;
}

export function updateSmtpSettings(settings: Partial<SmtpSettings>): SmtpSettings {
  currentSmtpSettings = { ...currentSmtpSettings, ...settings };
  return currentSmtpSettings;
}

export function getWebhookSettings(): WebhookSettings {
  return currentWebhookSettings;
}

export function updateWebhookSettings(settings: Partial<WebhookSettings>): WebhookSettings {
  currentWebhookSettings = { ...currentWebhookSettings, ...settings };
  return currentWebhookSettings;
}

export async function verifySmtpConnection(): Promise<{ success: boolean; message: string }> {
  try {
    if (!currentSmtpSettings.host) {
      return { success: false, message: "SMTP host is not configured." };
    }

    const transporter = nodemailer.createTransport({
      host: currentSmtpSettings.host,
      port: currentSmtpSettings.port,
      secure: currentSmtpSettings.secure,
      auth: currentSmtpSettings.username
        ? { user: currentSmtpSettings.username, pass: currentSmtpSettings.password }
        : undefined,
      connectionTimeout: 5000
    });

    await transporter.verify();
    return { success: true, message: `SMTP connection established successfully to ${currentSmtpSettings.host}:${currentSmtpSettings.port}` };
  } catch (err: any) {
    return { success: false, message: `SMTP verify error: ${err.message || String(err)}` };
  }
}

export async function sendDetectionEmail(article: any): Promise<boolean> {
  if (!currentSmtpSettings.enabled) {
    return false;
  }

  try {
    const transporter = nodemailer.createTransport({
      host: currentSmtpSettings.host,
      port: currentSmtpSettings.port,
      secure: currentSmtpSettings.secure,
      auth: currentSmtpSettings.username
        ? { user: currentSmtpSettings.username, pass: currentSmtpSettings.password }
        : undefined
    });

    const isSlaMet = article.delaySec <= 300;
    const subject = `[BlogSpy Alert] New Post Detected: "${article.title}" (${article.competitor})`;
    const html = `
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, sans-serif; max-width: 600px; margin: 0 auto; padding: 24px; border: 1px solid #e2e8f0; border-radius: 12px; background: #ffffff;">
        <div style="display: flex; align-items: center; justify-content: space-between; border-bottom: 2px solid #4f46e5; padding-bottom: 12px; margin-bottom: 16px;">
          <h2 style="color: #1e1b4b; margin: 0; font-size: 18px;">BlogSpy Intelligence Alert</h2>
          <span style="background: ${isSlaMet ? '#ecfdf5' : '#fff1f2'}; color: ${isSlaMet ? '#047857' : '#be123c'}; padding: 4px 8px; border-radius: 6px; font-size: 12px; font-weight: bold;">
            ${isSlaMet ? 'SLA <= 5m Met' : 'SLA Exceeded (>5m)'}
          </span>
        </div>

        <p style="font-size: 14px; color: #475569; margin: 0 0 12px;">A new publication event was detected by the autonomous crawler.</p>

        <div style="background: #f8fafc; border-radius: 8px; padding: 16px; margin-bottom: 16px;">
          <h3 style="margin: 0 0 8px; font-size: 16px; color: #0f172a;">${article.title}</h3>
          <p style="font-size: 13px; color: #64748b; margin: 0 0 12px;">${article.snippet || ''}</p>
          <table style="width: 100%; font-size: 12px; color: #334155;">
            <tr>
              <td style="padding: 4px 0; font-weight: bold;">Competitor:</td>
              <td style="padding: 4px 0;">${article.competitor} (${article.competitorDomain || ''})</td>
            </tr>
            <tr>
              <td style="padding: 4px 0; font-weight: bold;">Published At:</td>
              <td style="padding: 4px 0;">${article.publishedAt}</td>
            </tr>
            <tr>
              <td style="padding: 4px 0; font-weight: bold;">Detected At:</td>
              <td style="padding: 4px 0;">${article.discoveredAt}</td>
            </tr>
            <tr>
              <td style="padding: 4px 0; font-weight: bold;">Detection Delay:</td>
              <td style="padding: 4px 0; color: #4f46e5; font-weight: bold;">${article.delayFormatted || `${article.delaySec}s`}</td>
            </tr>
            <tr>
              <td style="padding: 4px 0; font-weight: bold;">Ingest Method:</td>
              <td style="padding: 4px 0;">${article.ingestMethod || 'Autonomous Feed'}</td>
            </tr>
          </table>
        </div>

        <div style="text-align: center; margin-top: 20px;">
          <a href="${article.url}" style="background: #4f46e5; color: #ffffff; text-decoration: none; padding: 10px 20px; border-radius: 6px; font-size: 13px; font-weight: 600; display: inline-block;">
            Read Original Article
          </a>
        </div>
      </div>
    `;

    await transporter.sendMail({
      from: currentSmtpSettings.fromAddress,
      to: currentSmtpSettings.recipients.join(", "),
      subject,
      html
    });

    return true;
  } catch (err) {
    console.error("Failed to send SMTP email:", err);
    return false;
  }
}

export async function dispatchWebhook(article: any): Promise<{ success: boolean; status?: number; error?: string }> {
  if (!currentWebhookSettings.enabled || !currentWebhookSettings.url) {
    return { success: false, error: "Webhook not configured or disabled" };
  }

  const payload = JSON.stringify({
    event: "competitor.article.detected",
    timestamp: new Date().toISOString(),
    article
  });

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    "User-Agent": "BlogSpy-Webhook-Dispatcher/1.0"
  };

  if (currentWebhookSettings.secretKey) {
    const signature = crypto
      .createHmac("sha256", currentWebhookSettings.secretKey)
      .update(payload)
      .digest("hex");
    headers["X-BlogSpy-Signature"] = signature;
  }

  let lastError = "";
  for (let attempt = 1; attempt <= currentWebhookSettings.retries; attempt++) {
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 6000);
      const res = await fetch(currentWebhookSettings.url, {
        method: "POST",
        headers,
        body: payload,
        signal: controller.signal
      });
      clearTimeout(timeout);

      if (res.ok) {
        return { success: true, status: res.status };
      }
      lastError = `HTTP status ${res.status}`;
    } catch (err: any) {
      lastError = err.message || String(err);
    }
    // Exponential backoff
    await new Promise((r) => setTimeout(r, Math.pow(2, attempt) * 500));
  }

  return { success: false, error: lastError };
}
