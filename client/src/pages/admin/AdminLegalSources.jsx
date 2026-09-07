import { useState, useEffect } from 'react';
import { PageHeader, Alert, Loading, Badge, EmptyState, dateFmt } from '../../components/ownerUi';

export default function AdminLegalSources() {
  const [activeTab, setActiveTab] = useState('sources');
  const [sources, setSources] = useState([]);
  const [knowledge, setKnowledge] = useState([]);
  const [auditLogs, setAuditLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    loadData();
  }, [activeTab]);

  const loadData = async () => {
    setLoading(true);
    setError('');
    try {
      if (activeTab === 'sources') {
        const res = await fetch('/api/legal-ai/admin/sources');
        const data = await res.json();
        setSources(data.sources || []);
      } else if (activeTab === 'knowledge') {
        const res = await fetch('/api/legal-ai/knowledge');
        const data = await res.json();
        setKnowledge(data.items || []);
      } else if (activeTab === 'audit') {
        const res = await fetch('/api/legal-ai/admin/audit-logs');
        const data = await res.json();
        setAuditLogs(data.logs || []);
      }
    } catch {
      setError('Failed to fetch legal administrative data.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="page" style={{ maxWidth: '1100px', margin: '0 auto' }}>
      <PageHeader
        title="Pakistan Legal AI Management Console"
        subtitle="Manage official legal sources, statutory knowledge base provisions, and monitor AI queries for safety and citation compliance."
      />

      <Alert kind="error" onClose={() => setError('')}>{error}</Alert>

      {/* Sub-nav */}
      <div style={{ display: 'flex', gap: '10px', borderBottom: '1px solid var(--border)', paddingBottom: '10px' }}>
        <button
          className={`btn ${activeTab === 'sources' ? 'btn-primary' : 'btn-ghost'}`}
          onClick={() => setActiveTab('sources')}
        >
          📜 Authoritative Legal Sources ({sources.length})
        </button>
        <button
          className={`btn ${activeTab === 'knowledge' ? 'btn-primary' : 'btn-ghost'}`}
          onClick={() => setActiveTab('knowledge')}
        >
          📚 Statutory Knowledge Base ({knowledge.length})
        </button>
        <button
          className={`btn ${activeTab === 'audit' ? 'btn-primary' : 'btn-ghost'}`}
          onClick={() => setActiveTab('audit')}
        >
          🛡️ AI Query & Safety Audit Logs ({auditLogs.length})
        </button>
      </div>

      {loading && <Loading label="Loading legal administrative data…" />}

      {/* SOURCES TAB */}
      {!loading && activeTab === 'sources' && (
        <div className="card">
          <div className="table-wrap">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Statute / Source Name</th>
                  <th>Short Code</th>
                  <th>Jurisdiction</th>
                  <th>Authority</th>
                  <th>Type / Year</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {sources.map((s) => (
                  <tr key={s.id}>
                    <td>
                      <strong>{s.name}</strong>
                      {s.source_url && (
                        <div>
                          <a
                            href={s.source_url}
                            target="_blank"
                            rel="noreferrer"
                            style={{ fontSize: '0.8rem', color: 'var(--accent-dark)' }}
                          >
                            Official Gazette Link ↗
                          </a>
                        </div>
                      )}
                    </td>
                    <td><code>{s.short_name}</code></td>
                    <td><span className="badge badge-info">{s.jurisdiction}</span></td>
                    <td>{s.authority}</td>
                    <td>{s.source_type} ({s.year || '—'})</td>
                    <td>
                      <span className="badge badge-success">✓ Verified Official</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* KNOWLEDGE TAB */}
      {!loading && activeTab === 'knowledge' && (
        <div className="card">
          <div className="table-wrap">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Section / Rule</th>
                  <th>Title</th>
                  <th>Category</th>
                  <th>Jurisdiction</th>
                  <th>Competent Venue</th>
                </tr>
              </thead>
              <tbody>
                {knowledge.map((k) => (
                  <tr key={k.id}>
                    <td><strong>{k.section_rule}</strong></td>
                    <td>
                      <div>{k.title}</div>
                      <small style={{ color: 'var(--text-muted)' }}>{k.source_name}</small>
                    </td>
                    <td><span className="badge badge-muted">{k.category}</span></td>
                    <td><span className="badge badge-info">{k.jurisdiction}</span></td>
                    <td>{k.authority_ref}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* AUDIT LOGS TAB */}
      {!loading && activeTab === 'audit' && (
        <div className="card">
          <div style={{ marginBottom: '14px' }}>
            <h3 style={{ margin: 0 }}>Recent User Legal Queries & Risk Screening</h3>
            <p className="card-hint">
              Audits question safety, detected risk levels, and automatically triggered lawyer escalation events.
            </p>
          </div>

          {auditLogs.length === 0 ? (
            <EmptyState title="No queries logged yet" hint="When users ask legal questions, compliance and citation logs will record here." />
          ) : (
            <div className="table-wrap">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Timestamp</th>
                    <th>User Query</th>
                    <th>Jurisdiction</th>
                    <th>Risk Level</th>
                    <th>Lawyer Escalated</th>
                    <th>Citation Status</th>
                  </tr>
                </thead>
                <tbody>
                  {auditLogs.map((log) => (
                    <tr key={log.id}>
                      <td style={{ fontSize: '0.82rem' }}>{dateFmt(log.created_at)}</td>
                      <td>
                        <strong>{log.query}</strong>
                      </td>
                      <td>{log.jurisdiction}</td>
                      <td>
                        <span
                          className={`badge badge-${
                            log.risk_level === 'high' ? 'danger' : log.risk_level === 'medium' ? 'warning' : 'success'
                          }`}
                        >
                          {log.risk_level}
                        </span>
                      </td>
                      <td>
                        {log.escalated === 1 ? (
                          <span className="badge badge-danger">🚨 Escalated to Lawyer</span>
                        ) : (
                          <span className="badge badge-muted">Informational</span>
                        )}
                      </td>
                      <td>
                        {log.citation_status === 'verified' ? (
                          <span className="badge badge-success">Verified</span>
                        ) : (
                          <span className="badge badge-warning">Unverified</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
