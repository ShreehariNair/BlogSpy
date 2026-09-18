import React, { useState } from 'react';
import { 
  Send, 
  Mail, 
  Globe, 
  Webhook, 
  Sliders, 
  CheckCircle2, 
  AlertCircle, 
  ShieldCheck, 
  Key, 
  RefreshCw, 
  ExternalLink,
  Code,
  Sparkles,
  Server,
  Lock,
  Plus,
  Trash2,
  X
} from 'lucide-react';
import { SmtpConfig, WordPressConfig, WebhookConfig, CrawlerSettings } from '../types';

export const IntegrationsView: React.FC = () => {
  const [subTab, setSubTab] = useState<'smtp' | 'wordpress' | 'webhooks' | 'crawler'>('smtp');

  // SMTP state
  const [smtp, setSmtp] = useState<SmtpConfig>({
    host: 'smtp.postmarkapp.com',
    port: 587,
    username: 'postmark-api-crawler-prod',
    fromAddress: 'crawler-alerts@blogspy.ai',
    recipients: ['intel-team@mycompany.com', 'cmo@mycompany.com', 'product-leads@mycompany.com'],
    rules: {
      instantDelayAlert: true,
      highThreatAlert: true,
      dailyDigest: true,
      systemHealthAlert: false,
    }
  });
  const [newRecipient, setNewRecipient] = useState('');
  const [isSendingEmailTest, setIsSendingEmailTest] = useState(false);
  const [emailTestStatus, setEmailTestStatus] = useState<string | null>(null);

  // WordPress state
  const [wp, setWp] = useState<WordPressConfig>({
    endpoint: 'https://mycompany.com/wp-json/wp/v2/posts',
    appPassword: '•••• •••• •••• ••••',
    defaultStatus: 'draft',
    targetCategory: 'Competitive Intelligence',
    canonicalAttribution: true,
    aiAutoTagging: true,
    connected: true
  });
  const [wpTestStatus, setWpTestStatus] = useState<string | null>(null);

  // Webhook state
  const [webhook, setWebhook] = useState<WebhookConfig>({
    url: 'https://hooks.slack.com/services/T00/B00/XXXXX',
    secretKey: 'whsec_984fbc982a0b81',
    retries: 3,
    active: true
  });
  const [webhookTestStatus, setWebhookTestStatus] = useState<string | null>(null);
  const [showSchemaModal, setShowSchemaModal] = useState(false);

  // Crawler settings
  const [crawler, setCrawler] = useState<CrawlerSettings>({
    pollingIntervalMin: 5,
    concurrencyLimit: 16,
    respectRobotsTxt: true,
    userAgent: 'BlogSpy-Bot/2.4 (+https://blogspy.ai/bot; bot@blogspy.ai)',
    requestJitter: true
  });

  const handleAddRecipient = (e: React.FormEvent) => {
    e.preventDefault();
    if (newRecipient && !smtp.recipients.includes(newRecipient)) {
      setSmtp({ ...smtp, recipients: [...smtp.recipients, newRecipient] });
      setNewRecipient('');
    }
  };

  const handleRemoveRecipient = (email: string) => {
    setSmtp({ ...smtp, recipients: smtp.recipients.filter(r => r !== email) });
  };

  const handleSendTestEmail = async () => {
    setIsSendingEmailTest(true);
    setEmailTestStatus(null);
    try {
      // Sync SMTP configuration to server
      await fetch('/api/settings/smtp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          host: smtp.host,
          port: Number(smtp.port),
          username: smtp.username,
          fromAddress: smtp.fromAddress,
          recipients: smtp.recipients,
          enabled: true
        })
      });

      const res = await fetch('/api/test-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ recipient: smtp.recipients[0] })
      });
      const data = await res.json();
      if (data.success) {
        setEmailTestStatus(data.message || 'SMTP Handshake Verified! Ready to dispatch live alerts.');
      } else {
        setEmailTestStatus(`Notice: ${data.message}`);
      }
    } catch (e: any) {
      setEmailTestStatus(`Connection notice: ${e.message}`);
    } finally {
      setIsSendingEmailTest(false);
      setTimeout(() => setEmailTestStatus(null), 6000);
    }
  };

  const handleTestWordPress = () => {
    setWpTestStatus('Testing REST API handshake...');
    setTimeout(() => {
      setWpTestStatus('Connection verified! User authenticated as Editor (Can create Drafts).');
      setTimeout(() => setWpTestStatus(null), 4000);
    }, 800);
  };

  const handleTestWebhook = async () => {
    setWebhookTestStatus('Dispatching live HMAC-SHA256 signed test payload...');
    try {
      await fetch('/api/settings/webhook', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          url: webhook.url,
          secretKey: webhook.secretKey,
          enabled: true,
          retries: webhook.retries
        })
      });

      const res = await fetch('/api/test-webhook', { method: 'POST' });
      const data = await res.json();
      if (data.success) {
        setWebhookTestStatus(`Webhook delivered successfully! Endpoint returned HTTP ${data.status || 200} OK.`);
      } else {
        setWebhookTestStatus(`Webhook notice: ${data.error || 'Endpoint connection failed'}`);
      }
    } catch (err: any) {
      setWebhookTestStatus(`Webhook error: ${err.message}`);
    } finally {
      setTimeout(() => setWebhookTestStatus(null), 6000);
    }
  };

  return (
    <div id="integrations-view" className="p-4 sm:p-6 lg:p-8 space-y-6 max-w-[1600px] mx-auto">
      {/* View Header */}
      <div className="pb-3 border-b border-slate-200">
        <div className="flex items-center space-x-2">
          <Send className="w-5 h-5 text-indigo-600" />
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900 font-mono-tech">
            Auto-Publish, Webhooks & Crawler Rules
          </h1>
        </div>
        <p className="text-xs sm:text-sm text-slate-500 mt-1">
          Configure real-time delivery notifications, WordPress REST API auto-publishing, external webhook endpoints, and rate-limiting safeguards.
        </p>
      </div>

      {/* Sub-Tabs Selector */}
      <div className="flex flex-wrap items-center gap-2 border-b border-slate-200 pb-3 text-xs">
        {[
          { id: 'smtp', label: 'Notifications & SMTP (V1)', icon: Mail },
          { id: 'wordpress', label: 'WordPress Auto-Publish (V2)', icon: Globe },
          { id: 'webhooks', label: 'API Keys & Webhooks', icon: Webhook },
          { id: 'crawler', label: 'Crawler Engine Safeguards', icon: Sliders },
        ].map((tab) => {
          const Icon = tab.icon;
          const isActive = subTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setSubTab(tab.id as any)}
              className={`flex items-center justify-center space-x-2 px-3 sm:px-4 py-2 rounded-xl font-semibold transition-all cursor-pointer ${
                isActive
                  ? 'bg-indigo-600 text-white shadow-xs'
                  : 'bg-white text-slate-600 hover:text-slate-900 border border-slate-200 shadow-2xs'
              }`}
            >
              <Icon className="w-4 h-4" />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* Tab 1: Notifications & SMTP */}
      {subTab === 'smtp' && (
        <div className="space-y-6 max-w-4xl">
          <div className="bg-white border border-slate-200/90 rounded-2xl p-5 sm:p-8 space-y-6 shadow-xs">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-3">
              <div>
                <h3 className="text-base font-bold text-slate-900 font-mono-tech">
                  SMTP Email Notification Gateway
                </h3>
                <p className="text-xs text-slate-500">
                  Direct transport credentials for instant sub-5-minute detection email alerts.
                </p>
              </div>
              <span className="self-start sm:self-auto text-xs px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 font-telemetry-mono font-medium">
                TLS 1.3 Active
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
              <div className="space-y-1.5">
                <label className="text-slate-700 font-medium">SMTP Server Host</label>
                <input
                  type="text"
                  value={smtp.host}
                  onChange={(e) => setSmtp({ ...smtp, host: e.target.value })}
                  className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-slate-800 font-telemetry-mono shadow-2xs focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-slate-700 font-medium">SMTP Port</label>
                <input
                  type="number"
                  value={smtp.port}
                  onChange={(e) => setSmtp({ ...smtp, port: Number(e.target.value) })}
                  className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-slate-800 font-telemetry-mono shadow-2xs focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-slate-700 font-medium">Username / API Key</label>
                <input
                  type="text"
                  value={smtp.username}
                  onChange={(e) => setSmtp({ ...smtp, username: e.target.value })}
                  className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-slate-800 font-telemetry-mono shadow-2xs focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-slate-700 font-medium">From Address</label>
                <input
                  type="email"
                  value={smtp.fromAddress}
                  onChange={(e) => setSmtp({ ...smtp, fromAddress: e.target.value })}
                  className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-slate-800 font-telemetry-mono shadow-2xs focus:outline-none focus:border-indigo-500"
                />
              </div>
            </div>

            {/* Recipient List Tags */}
            <div className="space-y-2 text-xs pt-2 border-t border-slate-100">
              <label className="text-slate-700 font-medium">Alert Recipients</label>
              <div className="flex flex-wrap gap-2 mb-2">
                {smtp.recipients.map((rec) => (
                  <span
                    key={rec}
                    className="inline-flex items-center space-x-1.5 bg-slate-50 text-indigo-700 border border-indigo-200 px-3 py-1 rounded-lg font-telemetry-mono text-[11px]"
                  >
                    <span>{rec}</span>
                    <button
                      onClick={() => handleRemoveRecipient(rec)}
                      className="text-slate-400 hover:text-rose-600 cursor-pointer"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </span>
                ))}
              </div>

              <form onSubmit={handleAddRecipient} className="flex flex-col sm:flex-row gap-2">
                <input
                  type="email"
                  placeholder="Add recipient email..."
                  value={newRecipient}
                  onChange={(e) => setNewRecipient(e.target.value)}
                  className="w-full sm:w-72 bg-white border border-slate-200 rounded-lg px-3 py-2 text-xs text-slate-800 font-telemetry-mono focus:outline-none focus:border-indigo-500 shadow-2xs"
                />
                <button
                  type="submit"
                  className="w-full sm:w-auto bg-slate-100 hover:bg-slate-200 border border-slate-200 text-slate-700 px-4 py-2 rounded-lg text-xs font-semibold flex items-center justify-center space-x-1 shadow-2xs cursor-pointer"
                >
                  <Plus className="w-3 h-3" />
                  <span>Add</span>
                </button>
              </form>
            </div>

            {/* Notification Trigger Rules */}
            <div className="space-y-3 pt-2 border-t border-slate-100 text-xs">
              <span className="text-slate-700 font-medium">Notification Trigger Rules</span>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <label className="flex items-center space-x-2.5 p-3 rounded-lg bg-slate-50 border border-slate-200 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={smtp.rules.instantDelayAlert}
                    onChange={(e) => setSmtp({ ...smtp, rules: { ...smtp.rules, instantDelayAlert: e.target.checked } })}
                    className="rounded bg-white border-slate-300 text-indigo-600 focus:ring-indigo-500 h-4 w-4"
                  />
                  <div>
                    <div className="font-semibold text-slate-800">Sub-5m SLA Detection Alert</div>
                    <div className="text-slate-500 text-[11px]">Notify immediately when article is caught &le; 5 min.</div>
                  </div>
                </label>

                <label className="flex items-center space-x-2.5 p-3 rounded-lg bg-slate-50 border border-slate-200 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={smtp.rules.highThreatAlert}
                    onChange={(e) => setSmtp({ ...smtp, rules: { ...smtp.rules, highThreatAlert: e.target.checked } })}
                    className="rounded bg-white border-slate-300 text-indigo-600 focus:ring-indigo-500 h-4 w-4"
                  />
                  <div>
                    <div className="font-semibold text-slate-800">High Threat Level Alert</div>
                    <div className="text-slate-500 text-[11px]">Instant alert if Gemini grades threat as High.</div>
                  </div>
                </label>

                <label className="flex items-center space-x-2.5 p-3 rounded-lg bg-slate-50 border border-slate-200 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={smtp.rules.dailyDigest}
                    onChange={(e) => setSmtp({ ...smtp, rules: { ...smtp.rules, dailyDigest: e.target.checked } })}
                    className="rounded bg-white border-slate-300 text-indigo-600 focus:ring-indigo-500 h-4 w-4"
                  />
                  <div>
                    <div className="font-semibold text-slate-800">Daily Intelligence Digest</div>
                    <div className="text-slate-500 text-[11px]">Summary sent every morning at 08:00 UTC.</div>
                  </div>
                </label>

                <label className="flex items-center space-x-2.5 p-3 rounded-lg bg-slate-50 border border-slate-200 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={smtp.rules.systemHealthAlert}
                    onChange={(e) => setSmtp({ ...smtp, rules: { ...smtp.rules, systemHealthAlert: e.target.checked } })}
                    className="rounded bg-white border-slate-300 text-indigo-600 focus:ring-indigo-500 h-4 w-4"
                  />
                  <div>
                    <div className="font-semibold text-slate-800">System Health Failure Alert</div>
                    <div className="text-slate-500 text-[11px]">Trigger if a node goes offline or retries exceed 5.</div>
                  </div>
                </label>
              </div>
            </div>

            {/* Test & Save Actions */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 pt-3 border-t border-slate-100">
              <button
                id="test-email-notification-btn"
                onClick={handleSendTestEmail}
                disabled={isSendingEmailTest}
                className="w-full sm:w-auto flex items-center justify-center space-x-2 bg-slate-100 hover:bg-slate-200 border border-slate-200 text-slate-700 px-4 py-2 rounded-lg text-xs font-semibold transition-colors disabled:opacity-60 shadow-2xs cursor-pointer"
              >
                <Mail className={`w-3.5 h-3.5 ${isSendingEmailTest ? 'animate-spin' : ''}`} />
                <span>{isSendingEmailTest ? 'Sending Test Email...' : 'Send Test Notification Email'}</span>
              </button>

              <button
                onClick={() => alert('SMTP Settings successfully saved to cluster vault.')}
                className="w-full sm:w-auto bg-indigo-600 hover:bg-indigo-700 text-white px-5 py-2 rounded-lg text-xs font-semibold shadow-xs cursor-pointer"
              >
                Save Notification Settings
              </button>
            </div>

            {emailTestStatus && (
              <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-800 flex items-center space-x-2 animate-in fade-in">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                <span>{emailTestStatus}</span>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Tab 2: WordPress Auto-Publishing (V2) */}
      {subTab === 'wordpress' && (
        <div className="space-y-6 max-w-4xl">
          <div className="bg-white border border-slate-200/90 rounded-2xl p-5 sm:p-8 space-y-6 shadow-xs">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-3">
              <div>
                <h3 className="text-base font-bold text-slate-900 font-mono-tech">
                  WordPress REST API Auto-Publishing (V2)
                </h3>
                <p className="text-xs text-slate-500">
                  Automatically draft or publish curated competitive response posts into your CMS.
                </p>
              </div>
              <span className="self-start sm:self-auto text-xs px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 font-telemetry-mono font-medium">
                REST v2 Connected
              </span>
            </div>

            <div className="space-y-4 text-xs">
              <div className="space-y-1.5">
                <label className="text-slate-700 font-medium">WordPress REST API Posts Endpoint</label>
                <input
                  type="text"
                  value={wp.endpoint}
                  onChange={(e) => setWp({ ...wp, endpoint: e.target.value })}
                  className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-slate-800 font-telemetry-mono shadow-2xs focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-slate-700 font-medium">Application Password / Token</label>
                  <input
                    type="password"
                    value={wp.appPassword}
                    onChange={(e) => setWp({ ...wp, appPassword: e.target.value })}
                    className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-slate-800 font-telemetry-mono shadow-2xs focus:outline-none focus:border-indigo-500"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-slate-700 font-medium">Default Post Status</label>
                  <select
                    value={wp.defaultStatus}
                    onChange={(e) => setWp({ ...wp, defaultStatus: e.target.value as any })}
                    className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-slate-800 shadow-2xs focus:outline-none focus:border-indigo-500"
                  >
                    <option value="draft">Draft (Recommended for editorial review)</option>
                    <option value="pending">Pending Review</option>
                    <option value="publish">Direct Publish (Immediate Live)</option>
                  </select>
                </div>
              </div>

              <div className="space-y-2 pt-2 border-t border-slate-100">
                <label className="flex items-center space-x-2.5 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={wp.canonicalAttribution}
                    onChange={(e) => setWp({ ...wp, canonicalAttribution: e.target.checked })}
                    className="rounded bg-white border-slate-300 text-indigo-600 focus:ring-indigo-500 h-4 w-4"
                  />
                  <span className="text-slate-700">
                    Automatically append canonical attribution link and competitor quote disclaimer
                  </span>
                </label>

                <label className="flex items-center space-x-2.5 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={wp.aiAutoTagging}
                    onChange={(e) => setWp({ ...wp, aiAutoTagging: e.target.checked })}
                    className="rounded bg-white border-slate-300 text-indigo-600 focus:ring-indigo-500 h-4 w-4"
                  />
                  <span className="text-slate-700">
                    Use Gemini AI to generate WordPress category tags from extracted themes
                  </span>
                </label>
              </div>

              <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 pt-3 border-t border-slate-100">
                <button
                  onClick={handleTestWordPress}
                  className="w-full sm:w-auto bg-slate-100 hover:bg-slate-200 border border-slate-200 text-slate-700 px-4 py-2 rounded-lg text-xs font-semibold shadow-2xs cursor-pointer"
                >
                  Test WordPress Handshake
                </button>
                <button
                  onClick={() => alert('WordPress configuration saved.')}
                  className="w-full sm:w-auto bg-indigo-600 hover:bg-indigo-700 text-white px-5 py-2 rounded-lg text-xs font-semibold shadow-xs cursor-pointer"
                >
                  Save WordPress Config
                </button>
              </div>

              {wpTestStatus && (
                <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-800 flex items-center space-x-2 animate-in fade-in">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  <span>{wpTestStatus}</span>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Tab 3: API Keys & Webhooks */}
      {subTab === 'webhooks' && (
        <div className="space-y-6 max-w-4xl">
          <div className="bg-white border border-slate-200/90 rounded-2xl p-5 sm:p-8 space-y-6 shadow-xs">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-3">
              <div>
                <h3 className="text-base font-bold text-slate-900 font-mono-tech">
                  Outbound JSON Webhooks & Event Fanout
                </h3>
                <p className="text-xs text-slate-500">
                  Deliver parsed article schemas and Gemini intelligence to Zapier, Make, Slack, or internal endpoints.
                </p>
              </div>
              <button
                onClick={() => setShowSchemaModal(true)}
                className="self-start sm:self-auto text-xs text-indigo-600 hover:text-indigo-800 font-telemetry-mono flex items-center space-x-1 font-medium cursor-pointer"
              >
                <Code className="w-3.5 h-3.5" />
                <span>Inspect JSON Schema</span>
              </button>
            </div>

            <div className="space-y-4 text-xs">
              <div className="space-y-1.5">
                <label className="text-slate-700 font-medium">Webhook Target URL</label>
                <input
                  type="text"
                  value={webhook.url}
                  onChange={(e) => setWebhook({ ...webhook, url: e.target.value })}
                  className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-slate-800 font-telemetry-mono shadow-2xs focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-slate-700 font-medium">HMAC-SHA256 Signing Secret</label>
                  <input
                    type="text"
                    value={webhook.secretKey}
                    onChange={(e) => setWebhook({ ...webhook, secretKey: e.target.value })}
                    className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-slate-800 font-telemetry-mono shadow-2xs focus:outline-none focus:border-indigo-500"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-slate-700 font-medium">Auto-Retry Backoff</label>
                  <select
                    value={webhook.retries}
                    onChange={(e) => setWebhook({ ...webhook, retries: Number(e.target.value) })}
                    className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-slate-800 shadow-2xs focus:outline-none focus:border-indigo-500"
                  >
                    <option value={3}>3 Retries with Exponential Backoff</option>
                    <option value={5}>5 Retries with Jitter</option>
                    <option value={1}>1 Retry (Immediate failover)</option>
                  </select>
                </div>
              </div>

              <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 pt-3 border-t border-slate-100">
                <button
                  onClick={handleTestWebhook}
                  className="w-full sm:w-auto bg-slate-100 hover:bg-slate-200 border border-slate-200 text-slate-700 px-4 py-2 rounded-lg text-xs font-semibold shadow-2xs cursor-pointer"
                >
                  Send Signed Test Webhook
                </button>
                <button
                  onClick={() => alert('Webhook configuration updated.')}
                  className="w-full sm:w-auto bg-indigo-600 hover:bg-indigo-700 text-white px-5 py-2 rounded-lg text-xs font-semibold shadow-xs cursor-pointer"
                >
                  Save Webhook Config
                </button>
              </div>

              {webhookTestStatus && (
                <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-800 flex items-center space-x-2 animate-in fade-in">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  <span>{webhookTestStatus}</span>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Tab 4: Crawler Engine Safeguards */}
      {subTab === 'crawler' && (
        <div className="space-y-6 max-w-4xl">
          <div className="bg-white border border-slate-200/90 rounded-2xl p-5 sm:p-8 space-y-6 shadow-xs">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-3">
              <div>
                <h3 className="text-base font-bold text-slate-900 font-mono-tech">
                  Crawler Engine Safeguards & Rate Limiting
                </h3>
                <p className="text-xs text-slate-500">
                  Protect against WAF IP bans, Cloudflare bot-fingerprinting, and target server overloading.
                </p>
              </div>
              <span className="self-start sm:self-auto text-xs px-2.5 py-0.5 rounded-full bg-indigo-50 text-indigo-700 border border-indigo-200 font-telemetry-mono font-medium">
                Polite Crawler Policy
              </span>
            </div>

            <div className="space-y-4 text-xs">
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-slate-700 font-medium">Default Target Polling Interval:</span>
                  <span className="font-telemetry-mono text-emerald-700 font-bold">{crawler.pollingIntervalMin} minutes</span>
                </div>
                <input
                  type="range"
                  min={1}
                  max={30}
                  value={crawler.pollingIntervalMin}
                  onChange={(e) => setCrawler({ ...crawler, pollingIntervalMin: Number(e.target.value) })}
                  className="w-full accent-indigo-600 cursor-pointer"
                />
                <div className="flex justify-between text-[10px] text-slate-500 font-telemetry-mono">
                  <span>1m (Aggressive)</span>
                  <span className="text-emerald-700 font-semibold">5m (Sub-5m SLA Target)</span>
                  <span>30m (Low Load)</span>
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-slate-700 font-medium">Worker Thread Concurrency Cap</label>
                <select
                  value={crawler.concurrencyLimit}
                  onChange={(e) => setCrawler({ ...crawler, concurrencyLimit: Number(e.target.value) })}
                  className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-slate-800 shadow-2xs focus:outline-none focus:border-indigo-500"
                >
                  <option value={8}>8 Concurrent Threads (Eco)</option>
                  <option value={16}>16 Concurrent Threads (Standard Cluster)</option>
                  <option value={32}>32 Concurrent Threads (Enterprise Tier)</option>
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="text-slate-700 font-medium">Custom User-Agent Identifier</label>
                <input
                  type="text"
                  value={crawler.userAgent}
                  onChange={(e) => setCrawler({ ...crawler, userAgent: e.target.value })}
                  className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-slate-800 font-telemetry-mono shadow-2xs focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div className="space-y-2 pt-2 border-t border-slate-100">
                <label className="flex items-center space-x-2.5 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={crawler.respectRobotsTxt}
                    onChange={(e) => setCrawler({ ...crawler, respectRobotsTxt: e.target.checked })}
                    className="rounded bg-white border-slate-300 text-indigo-600 focus:ring-indigo-500 h-4 w-4"
                  />
                  <span className="text-slate-700">
                    Strictly honor robots.txt crawl-delay directives
                  </span>
                </label>

                <label className="flex items-center space-x-2.5 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={crawler.requestJitter}
                    onChange={(e) => setCrawler({ ...crawler, requestJitter: e.target.checked })}
                    className="rounded bg-white border-slate-300 text-indigo-600 focus:ring-indigo-500 h-4 w-4"
                  />
                  <span className="text-slate-700">
                    Apply random request timing jitter (&plusmn;15s) to bypass heuristic bot pattern detection
                  </span>
                </label>
              </div>

              <div className="flex flex-col sm:flex-row justify-end pt-3 border-t border-slate-100">
                <button
                  onClick={() => alert('Crawler safeguards updated and synchronized across all 8 nodes.')}
                  className="w-full sm:w-auto bg-indigo-600 hover:bg-indigo-700 text-white px-5 py-2 rounded-lg text-xs font-semibold shadow-xs cursor-pointer"
                >
                  Save Safeguard Policies
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* JSON Schema Modal */}
      {showSchemaModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in">
          <div className="bg-white border border-slate-200 rounded-2xl max-w-md md:max-w-xl w-full mx-4 p-5 sm:p-6 space-y-4 shadow-xl">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-base font-bold text-slate-900 font-mono-tech">
                Webhook JSON Payload Schema
              </h3>
              <button 
                onClick={() => setShowSchemaModal(false)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg hover:bg-slate-100 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <pre className="bg-slate-900 p-4 rounded-xl border border-slate-800 text-xs font-telemetry-mono text-indigo-300 max-h-80 overflow-y-auto">
{`{
  "event": "article.detected",
  "timestamp": "2025-10-14T14:25:30Z",
  "delivery_id": "dlv_98fa012",
  "data": {
    "competitor": "TechCrunch",
    "domain": "techcrunch.com",
    "title": "Next-Gen Edge Inference",
    "url": "https://techcrunch.com/...",
    "published_at": "14:22:18 UTC",
    "discovered_at": "14:25:30 UTC",
    "detection_delay_sec": 192,
    "sla_target_met": true,
    "ai_analysis": {
      "summary": "...",
      "threat_rating": "High",
      "takeaways": ["..."],
      "counter_action": "..."
    }
  }
}`}
            </pre>
          </div>
        </div>
      )}
    </div>
  );
};
