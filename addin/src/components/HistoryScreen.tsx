import React, { useState, useEffect } from 'react';
import { apiClient, ReportRun } from '../services/api';

export const HistoryScreen: React.FC = () => {
  const [runs, setRuns] = useState<ReportRun[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadRuns();
  }, []);

  const loadRuns = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await apiClient.getRuns(20);
      setRuns(data.runs);
    } catch (err: any) {
      setError(err.message || 'Failed to load run history');
    } finally {
      setLoading(false);
    }
  };

  const getStatusClass = (status: string) => {
    switch (status) {
      case 'PENDING': return 'status-pending';
      case 'RUNNING': return 'status-running';
      case 'COMPLETED': return 'status-completed';
      case 'ERROR': return 'status-error';
      default: return '';
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    });
  };

  if (loading) {
    return (
      <div className="loading">
        <div className="spinner" />
        <div>Loading history...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div>
        <div className="message message-error">
          <strong>Error:</strong> {error}
        </div>
        <button className="btn btn-secondary btn-block" onClick={loadRuns}>
          Retry
        </button>
      </div>
    );
  }

  if (runs.length === 0) {
    return (
      <div className="empty-state">
        <div className="empty-state-icon">📋</div>
        <h2 className="empty-state-title">No Reports Yet</h2>
        <p className="empty-state-text">
          Generate your first report from the Generate tab
        </p>
      </div>
    );
  }

  return (
    <div className="history-screen">
      <div className="card">
        <div className="card-header">
          Recent Reports ({runs.length})
        </div>
        <ul className="run-list">
          {runs.map((run) => (
            <li key={run.id} className="run-item">
              <div className="run-header">
                <span className={`status-badge ${getStatusClass(run.status)}`}>
                  {run.status}
                </span>
                <span className="run-id">{run.id}</span>
              </div>
              
              <div className="run-details">
                <div>
                  <strong>Period:</strong>{' '}
                  {new Date(run.reportWindowStart).toLocaleDateString()} -{' '}
                  {new Date(run.reportWindowEnd).toLocaleDateString()}
                </div>
                
                <div className="run-time">
                  Started: {formatDate(run.startedAt)}
                  {run.completedAt && (
                    <> • Completed: {formatDate(run.completedAt)}</>
                  )}
                </div>

                {run.errorMessage && (
                  <div style={{ marginTop: '8px', fontSize: '12px', color: '#a80000' }}>
                    Error: {run.errorMessage}
                  </div>
                )}

                {run.outputUrl && (
                  <div style={{ marginTop: '8px' }}>
                    <a 
                      href={run.outputUrl} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="btn btn-secondary"
                      style={{ padding: '4px 8px', fontSize: '12px' }}
                    >
                      📄 View Report
                    </a>
                  </div>
                )}
              </div>
            </li>
          ))}
        </ul>
      </div>

      <button 
        className="btn btn-secondary btn-block" 
        onClick={loadRuns}
        style={{ marginTop: '12px' }}
      >
        🔄 Refresh
      </button>
    </div>
  );
};
