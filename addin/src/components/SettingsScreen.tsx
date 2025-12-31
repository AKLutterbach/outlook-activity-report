import React, { useState, useEffect } from 'react';
import { apiClient, UserSettings } from '../services/api';

export const SettingsScreen: React.FC = () => {
  const [settings, setSettings] = useState<UserSettings>({
    cadence: 'WEEKLY',
    outputMode: 'DRAFT_EMAIL_TO_SELF',
    dayOfWeek: 1,
    timeOfDay: '9:00',
    timezone: 'America/New_York',
    includeCalendar: true,
    includeSentMail: true,
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: string; text: string } | null>(null);

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      setLoading(true);
      const data = await apiClient.getSettings();
      setSettings(data);
      setMessage(null);
    } catch (error: any) {
      if (error.message.includes('not found')) {
        // No settings yet, use defaults
        setMessage(null);
      } else {
        setMessage({ type: 'error', text: `Failed to load settings: ${error.message}` });
      }
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      setMessage(null);
      const updated = await apiClient.updateSettings(settings);
      setSettings(updated);
      setMessage({ type: 'success', text: 'Settings saved successfully!' });
    } catch (error: any) {
      setMessage({ type: 'error', text: `Failed to save: ${error.message}` });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="loading">
        <div className="spinner" />
        <div>Loading settings...</div>
      </div>
    );
  }

  return (
    <div className="settings-screen">
      <div className="card">
        <div className="card-header">Report Schedule</div>
        <div className="card-body">
          <div className="form-group">
            <label className="form-label" htmlFor="cadence">
              Frequency
            </label>
            <select
              id="cadence"
              className="form-select"
              value={settings.cadence}
              onChange={(e) => setSettings({ ...settings, cadence: e.target.value as any })}
            >
              <option value="WEEKLY">Weekly</option>
              <option value="BIWEEKLY">Bi-weekly</option>
              <option value="MONTHLY">Monthly</option>
            </select>
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="dayOfWeek">
              Day of Week
            </label>
            <select
              id="dayOfWeek"
              className="form-select"
              value={settings.dayOfWeek}
              onChange={(e) => setSettings({ ...settings, dayOfWeek: parseInt(e.target.value) })}
            >
              <option value="1">Monday</option>
              <option value="2">Tuesday</option>
              <option value="3">Wednesday</option>
              <option value="4">Thursday</option>
              <option value="5">Friday</option>
              <option value="6">Saturday</option>
              <option value="7">Sunday</option>
            </select>
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="timeOfDay">
              Time of Day
            </label>
            <input
              type="time"
              id="timeOfDay"
              className="form-input"
              value={settings.timeOfDay}
              onChange={(e) => setSettings({ ...settings, timeOfDay: e.target.value })}
            />
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="timezone">
              Timezone
            </label>
            <select
              id="timezone"
              className="form-select"
              value={settings.timezone}
              onChange={(e) => setSettings({ ...settings, timezone: e.target.value })}
            >
              <option value="America/New_York">Eastern Time</option>
              <option value="America/Chicago">Central Time</option>
              <option value="America/Denver">Mountain Time</option>
              <option value="America/Los_Angeles">Pacific Time</option>
              <option value="Europe/London">London</option>
              <option value="Europe/Paris">Paris</option>
              <option value="Asia/Tokyo">Tokyo</option>
            </select>
          </div>

          {settings.nextRunUtc && (
            <div className="message message-info">
              <strong>Next run:</strong> {new Date(settings.nextRunUtc).toLocaleString()}
            </div>
          )}
        </div>
      </div>

      <div className="card">
        <div className="card-header">Report Content</div>
        <div className="card-body">
          <div className="form-group">
            <label className="form-checkbox">
              <input
                type="checkbox"
                checked={settings.includeCalendar}
                onChange={(e) => setSettings({ ...settings, includeCalendar: e.target.checked })}
              />
              <span>Include Calendar Events</span>
            </label>
          </div>

          <div className="form-group">
            <label className="form-checkbox">
              <input
                type="checkbox"
                checked={settings.includeSentMail}
                onChange={(e) => setSettings({ ...settings, includeSentMail: e.target.checked })}
              />
              <span>Include Sent Mail Statistics</span>
            </label>
          </div>
        </div>
      </div>

      <div className="card">
        <div className="card-header">Output Options</div>
        <div className="card-body">
          <div className="form-group">
            <label className="form-label" htmlFor="outputMode">
              Delivery Method
            </label>
            <select
              id="outputMode"
              className="form-select"
              value={settings.outputMode}
              onChange={(e) => setSettings({ ...settings, outputMode: e.target.value as any })}
            >
              <option value="DRAFT_EMAIL_TO_SELF">Draft Email to Self</option>
              <option value="SEND_EMAIL_TO_SELF">Send Email to Self</option>
              <option value="PDF_ONLY">PDF Only</option>
              <option value="DRAFT_PLUS_PDF">Draft Email + PDF</option>
            </select>
            <div className="form-help">
              Draft emails will appear in your Outlook drafts folder
            </div>
          </div>
        </div>
      </div>

      {message && (
        <div className={`message message-${message.type}`}>
          {message.text}
        </div>
      )}

      <button
        className="btn btn-primary btn-block"
        onClick={handleSave}
        disabled={saving}
      >
        {saving ? (
          <>
            <span className="spinner" style={{ width: 16, height: 16, borderWidth: 2, margin: 0 }} />
            Saving...
          </>
        ) : (
          'Save Settings'
        )}
      </button>
    </div>
  );
};
