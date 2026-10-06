export default function CallSummary({ summary }) {
  if (!summary) return null;

  const intentColors = {
    ORDER_TRACKING: '#6366f1',
    CANCELLATION: '#ef4444',
    RETURN: '#f59e0b',
    REFUND: '#f59e0b',
    SHIPPING: '#3b82f6',
    COD: '#22c55e',
    GENERAL_QUERY: '#8b5cf6',
    OUT_OF_SCOPE: '#6b7280',
    UNKNOWN: '#6b7280',
  };

  const statusColors = {
    RESOLVED: '#22c55e',
    UNRESOLVED: '#ef4444',
    OUT_OF_SCOPE: '#6b7280',
    NEEDS_INFORMATION: '#f59e0b',
  };

  return (
    <div className="call-summary">
      <h3 className="section-title">📋 Post-Call Summary</h3>

      <div className="summary-grid">
        <div className="summary-item">
          <span className="summary-label">Intent</span>
          <span
            className="summary-badge"
            style={{
              backgroundColor:
                intentColors[summary.customer_intent] || '#6b7280',
            }}
          >
            {summary.customer_intent || 'UNKNOWN'}
          </span>
        </div>

        <div className="summary-item">
          <span className="summary-label">Order ID</span>
          <span className="summary-value">
            {summary.order_id || 'N/A'}
          </span>
        </div>

        <div className="summary-item">
          <span className="summary-label">Resolution</span>
          <span
            className="summary-badge"
            style={{
              backgroundColor:
                statusColors[summary.resolution_status] || '#6b7280',
            }}
          >
            {summary.resolution_status || 'UNKNOWN'}
          </span>
        </div>

        <div className="summary-item full-width">
          <span className="summary-label">Summary</span>
          <p className="summary-text">
            {summary.call_summary || 'No summary available.'}
          </p>
        </div>
      </div>

      {/* Raw JSON */}
      <details className="summary-json-toggle">
        <summary>View Raw JSON</summary>
        <pre className="summary-json">
          {JSON.stringify(summary, null, 2)}
        </pre>
      </details>
    </div>
  );
}
