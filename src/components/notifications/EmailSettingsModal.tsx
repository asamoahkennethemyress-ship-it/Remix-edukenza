import React, { useState, useEffect } from 'react';
import { 
  X, 
  Mail, 
  Save, 
  Plus, 
  Trash2, 
  Edit2, 
  Check, 
  AlertCircle,
  FileText,
  Sliders,
  Sparkles,
  Loader2
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { getEmailSettings, saveEmailSettings } from '../../services/notificationService';

interface EmailSettingsModalProps {
  onClose: () => void;
}

export const EmailSettingsModal: React.FC<EmailSettingsModalProps> = ({ onClose }) => {
  const { currentUser, showToast } = useAuth();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const schoolId = currentUser?.schoolId || 'global';

  const [emailNotificationsEnabled, setEmailNotificationsEnabled] = useState(true);
  const [senderName, setSenderName] = useState('EDUkenZA School System');
  const [senderEmail, setSenderEmail] = useState('notifications@edukenza.com');

  const [templates, setTemplates] = useState<{ [key: string]: { subject: string; body: string; enabled: boolean } }>({
    'Attendance': {
      subject: 'EDUkenZA Attendance Alert: {{studentName}} Absent',
      body: 'Dear Parent,\n\nThis is an automated notification to inform you that {{studentName}} was recorded as ABSENT on {{date}}.\n\nPlease contact the school administration if you have questions.\n\nBest regards,\n{{schoolName}}',
      enabled: true
    },
    'Assignment': {
      subject: 'New Academic Assignment Published: {{assignmentTitle}}',
      body: 'Hello {{studentName}},\n\nA new assignment titled "{{assignmentTitle}}" has been published for {{className}}.\n\nDue Date: {{dueDate}}\n\nPlease check your student portal for details.',
      enabled: true
    },
    'Payment': {
      subject: 'Payment Receipt Confirmation: Receipt #{{receiptNo}}',
      body: 'Dear Parent,\n\nThank you for your payment of {{amount}} towards school fees for {{studentName}}.\n\nReceipt Number: {{receiptNo}}\nStatus: Confirmed & Recorded\n\nBest regards,\nAccounts Office',
      enabled: true
    },
    'Results': {
      subject: 'Academic Performance Results Released',
      body: 'Dear Parent/Student,\n\nOfficial results for {{examName}} have been approved and published.\n\nPlease log in to the EDUkenZA portal to view complete scorecards.',
      enabled: true
    }
  });

  const [activeTemplateKey, setActiveTemplateKey] = useState('Attendance');

  useEffect(() => {
    async function load() {
      try {
        const data = await getEmailSettings(schoolId);
        if (data) {
          if (data.emailNotificationsEnabled !== undefined) setEmailNotificationsEnabled(data.emailNotificationsEnabled);
          if (data.senderName) setSenderName(data.senderName);
          if (data.senderEmail) setSenderEmail(data.senderEmail);
          if (data.templates) setTemplates(data.templates);
        }
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [schoolId]);

  const handleTemplateChange = (field: 'subject' | 'body' | 'enabled', value: any) => {
    setTemplates(prev => ({
      ...prev,
      [activeTemplateKey]: {
        ...prev[activeTemplateKey],
        [field]: value
      }
    }));
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await saveEmailSettings(schoolId, {
        emailNotificationsEnabled,
        senderName,
        senderEmail,
        templates
      });
      showToast('Email notification templates saved successfully', 'info');
      onClose();
    } catch (e) {
      showToast('Error saving email templates', 'error');
    } finally {
      setSaving(false);
    }
  };

  const activeTemplate = templates[activeTemplateKey];

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4">
      <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-2xl w-full p-6 shadow-2xl space-y-6 animate-in fade-in zoom-in-95 max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-2xl bg-amber-500/10 text-amber-400">
              <Mail className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white">Email Notification Templates</h3>
              <p className="text-xs text-slate-400">Configure automated email subjects and message bodies</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-white rounded-xl hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {loading ? (
          <div className="py-12 text-center text-slate-400 space-y-2">
            <Loader2 className="w-6 h-6 animate-spin mx-auto text-amber-500" />
            <p className="text-xs">Loading email configuration...</p>
          </div>
        ) : (
          <div className="space-y-5">
            {/* Global Email Dispatch Toggle */}
            <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 flex items-center justify-between">
              <div>
                <h4 className="text-xs font-semibold text-white">Enable Automated Email Dispatch</h4>
                <p className="text-[11px] text-slate-400">Send formatted email notifications for critical triggers</p>
              </div>
              <input
                type="checkbox"
                checked={emailNotificationsEnabled}
                onChange={(e) => setEmailNotificationsEnabled(e.target.checked)}
                className="w-4 h-4 accent-amber-500 rounded cursor-pointer"
              />
            </div>

            {/* Sender Metadata */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Sender Name</label>
                <input
                  type="text"
                  value={senderName}
                  onChange={(e) => setSenderName(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-amber-500"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Sender Email</label>
                <input
                  type="email"
                  value={senderEmail}
                  onChange={(e) => setSenderEmail(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-amber-500"
                />
              </div>
            </div>

            {/* Template Selector Tabs */}
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-2">Select Template to Customize</label>
              <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-none">
                {Object.keys(templates).map((key) => (
                  <button
                    key={key}
                    type="button"
                    onClick={() => setActiveTemplateKey(key)}
                    className={`px-3.5 py-2 rounded-xl text-xs font-semibold transition shrink-0 flex items-center gap-2 border ${
                      activeTemplateKey === key
                        ? 'bg-amber-500 text-slate-950 border-amber-500'
                        : 'bg-slate-950 text-slate-400 border-slate-800 hover:text-white'
                    }`}
                  >
                    <span>{key}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Active Template Editor */}
            {activeTemplate && (
              <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 space-y-3">
                <div className="flex items-center justify-between pb-2 border-b border-slate-800">
                  <span className="text-xs font-bold text-amber-400 uppercase tracking-wider">{activeTemplateKey} Template</span>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <span className="text-[11px] text-slate-400">Template Enabled</span>
                    <input
                      type="checkbox"
                      checked={activeTemplate.enabled}
                      onChange={(e) => handleTemplateChange('enabled', e.target.checked)}
                      className="w-3.5 h-3.5 accent-amber-500 rounded"
                    />
                  </label>
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-slate-300 mb-1">Subject Line</label>
                  <input
                    type="text"
                    value={activeTemplate.subject}
                    onChange={(e) => handleTemplateChange('subject', e.target.value)}
                    className="w-full px-3 py-2 bg-slate-900 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-amber-500"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-slate-300 mb-1">Email Body Template</label>
                  <textarea
                    rows={6}
                    value={activeTemplate.body}
                    onChange={(e) => handleTemplateChange('body', e.target.value)}
                    className="w-full px-3 py-2 bg-slate-900 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-amber-500 resize-none font-mono"
                  />
                  <p className="text-[10px] text-slate-500 mt-1">
                    Available dynamic tags: <code className="text-amber-400">{"{{studentName}}"}</code>, <code className="text-amber-400">{"{{assignmentTitle}}"}</code>, <code className="text-amber-400">{"{{amount}}"}</code>, <code className="text-amber-400">{"{{receiptNo}}"}</code>, <code className="text-amber-400">{"{{schoolName}}"}</code>
                  </p>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Footer */}
        <div className="pt-3 border-t border-slate-800 flex justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold text-slate-300 hover:bg-slate-800 rounded-xl transition"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={saving || loading}
            className="px-5 py-2 text-xs font-bold bg-amber-500 hover:bg-amber-400 text-slate-950 rounded-xl transition flex items-center gap-2 shadow-lg shadow-amber-500/10"
          >
            <Save className="w-3.5 h-3.5" />
            <span>{saving ? 'Saving...' : 'Save Templates'}</span>
          </button>
        </div>
      </div>
    </div>
  );
};
