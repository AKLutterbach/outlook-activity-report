import React, { useState } from 'react';
import { signIn } from '../services/authService';

interface ConnectScreenProps {
  onConnect: (user: { userId: string; email: string; tenantId: string }) => void;
}

export const ConnectScreen: React.FC<ConnectScreenProps> = ({ onConnect }) => {
  const [connecting, setConnecting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleConnect = async () => {
    setConnecting(true);
    setError(null);

    try {
      console.log('[ConnectScreen] Starting dialog authentication...');
      
      const user = await signIn();
      console.log('[ConnectScreen] Signed in:', user);
      
      // Navigate to next screen or update parent state
      onConnect(user);
      
    } catch (err: any) {
      console.error('[ConnectScreen] Sign-in failed:', err);
      setError(err.message || 'Failed to connect. Please try again.');
      setConnecting(false);
    }
  };

  return (
    <div className="connect-screen">
      <div className="empty-state">
        <div className="empty-state-icon">📧</div>
        <h2 className="empty-state-title">Welcome to Outlook Weekly Reports</h2>
        <p className="empty-state-text">
          Get automated weekly summaries of your Outlook activity
        </p>
      </div>

      <div className="card">
        <div className="card-header">Connect Your Account</div>
        <div className="card-body">
          <p style={{ marginBottom: '16px' }}>
            Sign in with your Microsoft 365 account to get started. We'll request permission to:
          </p>

          <ul style={{ marginBottom: '20px', paddingLeft: '20px' }}>
            <li>Read your calendar events</li>
            <li>Read your sent emails</li>
            <li>Create draft emails with reports</li>
          </ul>

          {error && (
            <div className="message message-error" style={{ marginBottom: '16px' }}>
              <strong>Error:</strong> {error}
            </div>
          )}

          <button
            className="btn btn-primary btn-block"
            onClick={handleConnect}
            disabled={connecting}
          >
            {connecting ? (
              <>
                <span className="spinner" style={{ width: 16, height: 16, borderWidth: 2, margin: 0 }} />
                Connecting...
              </>
            ) : (
              'Connect with Microsoft 365'
            )}
          </button>
        </div>
      </div>

      <div className="message message-info">
        <strong>Privacy:</strong> Your data stays in your Microsoft 365 account. 
        We only create reports based on your calendar and email activity.
      </div>
    </div>
  );
};
