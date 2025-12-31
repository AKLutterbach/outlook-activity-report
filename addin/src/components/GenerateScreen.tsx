import React, { useState } from 'react';
import { apiClient, GenerateResponse } from '../services/api';

export const GenerateScreen: React.FC = () => {
  const [generating, setGenerating] = useState(false);
  const [result, setResult] = useState<GenerateResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleGenerate = async () => {
    try {
      setGenerating(true);
      setError(null);
      setResult(null);
      
      const response = await apiClient.generateReport();
      setResult(response);
    } catch (err: any) {
      setError(err.message || 'Failed to generate report');
    } finally {
      setGenerating(false);
    }
  };

  return (
    <div className="generate-screen">
      <div className="card">
        <div className="card-header">Generate Report Now</div>
        <div className="card-body">
          <p style={{ marginBottom: '16px' }}>
            Create an on-demand report for the current week. The report will be 
            generated immediately and delivered according to your settings.
          </p>

          <div className="message message-info">
            <strong>Report Period:</strong> Last 7 days<br />
            <strong>Includes:</strong> Email statistics, calendar events, top conversations
          </div>

          <button
            className="btn btn-success btn-block"
            onClick={handleGenerate}
            disabled={generating}
            style={{ marginTop: '16px' }}
          >
            {generating ? (
              <>
                <span className="spinner" style={{ width: 16, height: 16, borderWidth: 2, margin: 0 }} />
                Generating Report...
              </>
            ) : (
              <>
                ⚡ Generate Report Now
              </>
            )}
          </button>
        </div>
      </div>

      {result && (
        <div className="card">
          <div className="card-header">Generation Complete</div>
          <div className="card-body">
            {result.status === 'ERROR' ? (
              <div className="message message-warning">
                <strong>Note:</strong> {result.message}
                <br />
                <small>{result.errorMessage}</small>
              </div>
            ) : (
              <div className="message message-success">
                <strong>Success!</strong> Your report has been generated.
                <br />
                <small>Run ID: {result.runId}</small>
              </div>
            )}
            <p style={{ marginTop: '12px', fontSize: '13px', color: '#605e5c' }}>
              Check the History tab to view your report.
            </p>
          </div>
        </div>
      )}

      {error && (
        <div className="message message-error">
          <strong>Error:</strong> {error}
        </div>
      )}

      <div className="card">
        <div className="card-header">ℹ️ About Generated Reports</div>
        <div className="card-body" style={{ fontSize: '13px', color: '#605e5c' }}>
          <ul style={{ marginLeft: '20px', lineHeight: '1.8' }}>
            <li>Reports are generated from your Outlook activity</li>
            <li>Scheduled reports run automatically based on your settings</li>
            <li>On-demand reports are generated immediately</li>
            <li>All reports are stored in your history</li>
          </ul>
        </div>
      </div>
    </div>
  );
};
