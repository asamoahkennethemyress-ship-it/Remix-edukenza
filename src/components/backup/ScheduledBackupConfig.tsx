import React, { useState, useEffect } from 'react';
import { Clock, Calendar, Mail, ShieldCheck, CheckCircle2, Save, Loader2, AlertCircle } from 'lucide-react';
import { AutomaticBackupSettings, ScheduleFrequency } from '../../types/backup';
import { getAutomaticBackupSettings, saveAutomaticBackupSettings } from '../../services/backupService';
import { useAuth } from '../../context/AuthContext';

interface ScheduledBackupConfigProps {
  schoolId: string;
  userUid: string;
  userName: string;
}

export const ScheduledBackupConfig: React.FC<ScheduledBackupConfigProps> = ({
  schoolId,
  userUid,
  userName
}) => {
  const { showToast } = useAuth();
  const [settings, setSettings] = useState<AutomaticBackupSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');

  useEffect(() => {
    loadSettings();
  }, [schoolId]);

  const loadSettings = async () => {
    setLoading(true);
    try {
      const data = await getAutomaticBackupSettings(schoolId);
      setSettings(data);
    } catch (e) {
      console.warn("Error loading settings:", e);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!settings) return;
    setSaving(true);
    setSuccessMsg('');

    try {
      await saveAutomaticBackupSettings(settings, schoolId, userUid, userName);
      showToast('Automatic backup schedule configuration saved successfully.', 'success');
      setSuccessMsg('Automatic backup schedule configuration saved successfully.');
      setTimeout(() => setSuccessMsg(''), 4000);
    } catch (e: any) {
      showToast(`Save Failed: ${e.message || 'Error saving settings.'}`, 'error');
    } finally {
      setSaving(false);
    }
  };

  if (loading || !settings) {
    return (
      <div className="bg-white rounded-2xl border border-slate-200 p-8 text-center text-slate-500">
        <Loader2 className="w-8 h-8 text-indigo-600 animate-spin mx-auto mb-2" />
        <p className="text-xs font-bold">Loading automatic backup configuration...</p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 space-y-6">
      
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-100 pb-5">
        <div>
          <div className="flex items-center gap-2 text-indigo-600 font-bold text-xs uppercase tracking-wider">
            <Clock className="w-4 h-4" /> Automated Background Safeguards
          </div>
          <h2 className="text-lg font-extrabold text-slate-900 mt-0.5">Automatic Backup Schedule</h2>
          <p className="text-xs text-slate-500 mt-1">
            Configure automated system data snapshots stored securely in Cloud Storage.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <span className="text-xs font-bold text-slate-700">Status:</span>
          <button
            onClick={() => setSettings({ ...settings, enabled: !settings.enabled })}
            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none ${
              settings.enabled ? 'bg-indigo-600' : 'bg-slate-300'
            }`}
          >
            <span
              className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                settings.enabled ? 'translate-x-6' : 'translate-x-1'
              }`}
            />
          </button>
          <span className={`text-xs font-bold ${settings.enabled ? 'text-indigo-600' : 'text-slate-400'}`}>
            {settings.enabled ? 'ENABLED' : 'DISABLED'}
          </span>
        </div>
      </div>

      {successMsg && (
        <div className="p-3.5 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl text-xs font-bold flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          {successMsg}
        </div>
      )}

      {/* Schedule Settings Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        
        {/* Frequency */}
        <div className="space-y-2">
          <label className="block text-xs font-bold text-slate-800">
            Backup Frequency:
          </label>
          <div className="grid grid-cols-3 gap-2">
            {(['daily', 'weekly', 'monthly'] as ScheduleFrequency[]).map(freq => (
              <button
                key={freq}
                type="button"
                onClick={() => setSettings({ ...settings, frequency: freq })}
                disabled={!settings.enabled}
                className={`py-2.5 px-3 rounded-xl border text-xs font-bold capitalize transition ${
                  settings.frequency === freq && settings.enabled
                    ? 'border-indigo-600 bg-indigo-50 text-indigo-700 shadow-sm'
                    : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50 disabled:opacity-40'
                }`}
              >
                {freq}
              </button>
            ))}
          </div>
        </div>

        {/* Execution Time */}
        <div className="space-y-2">
          <label className="block text-xs font-bold text-slate-800">
            Off-Peak Execution Time (UTC):
          </label>
          <input
            type="time"
            value={settings.timeOfDay}
            onChange={(e) => setSettings({ ...settings, timeOfDay: e.target.value })}
            disabled={!settings.enabled}
            className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:opacity-40"
          />
        </div>

        {/* Notification Email */}
        <div className="space-y-2">
          <label className="block text-xs font-bold text-slate-800 flex items-center gap-1.5">
            <Mail className="w-3.5 h-3.5 text-indigo-600" /> Alert Email Address:
          </label>
          <input
            type="email"
            value={settings.notifyEmail}
            onChange={(e) => setSettings({ ...settings, notifyEmail: e.target.value })}
            disabled={!settings.enabled}
            placeholder="admin@edukenza.com"
            className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:opacity-40"
          />
        </div>

        {/* Retention Policy */}
        <div className="space-y-2">
          <label className="block text-xs font-bold text-slate-800">
            Auto-Archive Retention Period:
          </label>
          <select
            value={settings.autoDeleteDays}
            onChange={(e) => setSettings({ ...settings, autoDeleteDays: Number(e.target.value) })}
            disabled={!settings.enabled}
            className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:opacity-40"
          >
            <option value={14}>Retain for 14 Days</option>
            <option value={30}>Retain for 30 Days (Recommended)</option>
            <option value={60}>Retain for 60 Days</option>
            <option value={90}>Retain for 90 Days</option>
          </select>
        </div>

      </div>

      {/* Schedule Info Box */}
      <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 flex flex-wrap items-center justify-between gap-4 text-xs">
        <div>
          <span className="text-slate-500 block">Last Run Timestamp:</span>
          <span className="font-bold text-slate-800">
            {settings.lastRunAt ? new Date(settings.lastRunAt).toLocaleString() : 'Never'}
          </span>
        </div>
        <div>
          <span className="text-slate-500 block">Next Scheduled Run:</span>
          <span className="font-bold text-indigo-600">
            {settings.enabled && settings.nextRunAt 
              ? new Date(settings.nextRunAt).toLocaleString() 
              : 'Schedule Disabled'}
          </span>
        </div>
      </div>

      {/* Action Footer */}
      <div className="pt-2 flex justify-end">
        <button
          onClick={handleSave}
          disabled={saving}
          className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-xl shadow transition flex items-center gap-2 disabled:opacity-50"
        >
          {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
          Save Schedule Settings
        </button>
      </div>

    </div>
  );
};
