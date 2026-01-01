import React, { useState, useEffect } from 'react';
import ReactDOM from 'react-dom/client';
import { ConnectScreen } from './components/ConnectScreen';
import { SettingsScreen } from './components/SettingsScreen';
import { GenerateScreen } from './components/GenerateScreen';
import { HistoryScreen } from './components/HistoryScreen';
import { initializeAuth, logout } from './services/authService';
import { AuthenticationError } from './services/api';
import './styles/app.css';

type Screen = 'connect' | 'settings' | 'generate' | 'history';

const App: React.FC = () => {
  const [currentScreen, setCurrentScreen] = useState<Screen>('connect');
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [isConnected, setIsConnected] = useState(false);

  // Check for existing session on mount
  useEffect(() => {
    initializeAuth().then(user => {
      if (user) {
        setUserEmail(user.email);
        setIsConnected(true);
        setCurrentScreen('settings');
      }
    });
  }, []);

  // Global error handler for authentication errors
  useEffect(() => {
    const handleAuthError = (event: ErrorEvent) => {
      if (event.error instanceof AuthenticationError) {
        handleDisconnect();
      }
    };

    window.addEventListener('error', handleAuthError);
    return () => window.removeEventListener('error', handleAuthError);
  }, []);

  const handleConnect = (user: { userId: string; email: string; tenantId: string }) => {
    setUserEmail(user.email);
    setIsConnected(true);
    setCurrentScreen('settings');
  };

  const handleDisconnect = () => {
    logout();
    
    setIsConnected(false);
    setUserEmail(null);
    setCurrentScreen('connect');
  };

  const renderScreen = () => {
    if (!isConnected) {
      return <ConnectScreen onConnect={handleConnect} />;
    }

    switch (currentScreen) {
      case 'settings':
        return <SettingsScreen />;
      case 'generate':
        return <GenerateScreen />;
      case 'history':
        return <HistoryScreen />;
      default:
        return <SettingsScreen />;
    }
  };

  return (
    <div className="app-container">
      <header className="app-header">
        <h1>📧 Outlook Weekly Reports</h1>
      </header>

      {isConnected && (
        <nav className="nav-tabs">
          <button
            className={`nav-tab ${currentScreen === 'settings' ? 'active' : ''}`}
            onClick={() => setCurrentScreen('settings')}
          >
            ⚙️ Settings
          </button>
          <button
            className={`nav-tab ${currentScreen === 'generate' ? 'active' : ''}`}
            onClick={() => setCurrentScreen('generate')}
          >
            ⚡ Generate
          </button>
          <button
            className={`nav-tab ${currentScreen === 'history' ? 'active' : ''}`}
            onClick={() => setCurrentScreen('history')}
          >
            📋 History
          </button>
        </nav>
      )}

      <main className="app-content">
        {renderScreen()}
      </main>

      {isConnected && (
        <footer className="app-footer">
          <button
            className="btn btn-secondary"
            onClick={handleDisconnect}
            style={{ fontSize: '13px', padding: '6px 12px' }}
          >
            Disconnect ({userEmail})
          </button>
        </footer>
      )}
    </div>
  );
};

Office.onReady(() => {
  const root = ReactDOM.createRoot(document.getElementById('root') as HTMLElement);
  root.render(<App />);
});

export default App;

