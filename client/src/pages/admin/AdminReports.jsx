import { useState, useEffect } from 'react';
import { adminApi } from '../../lib/adminStore';

/**
 * Interactive SVG Donut / Ring Chart Component
 */
function DonutChart({ title, data, total }) {
  if (!data || data.length === 0 || !total) {
    return (
      <div style={{ padding: '24px', textAlign: 'center', color: 'var(--text-muted)' }}>
        No data available
      </div>
    );
  }

  const radius = 65;
  const circumference = 2 * Math.PI * radius;
  let accumulatedPercent = 0;

  return (
    <div style={{
      background: 'var(--card)',
      border: '1px solid var(--border)',
      borderRadius: '16px',
      padding: '24px',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center'
    }}>
      <h3 style={{ fontSize: '1rem', fontWeight: 600, color: 'var(--text)', marginBottom: '16px', alignSelf: 'flex-start' }}>
        {title}
      </h3>

      <div style={{ position: 'relative', width: '180px', height: '180px' }}>
        <svg width="180" height="180" viewBox="0 0 180 180" style={{ transform: 'rotate(-90deg)' }}>
          {/* Base Ring */}
          <circle
            cx="90"
            cy="90"
            r={radius}
            fill="transparent"
            stroke="#f3f4f6"
            strokeWidth="20"
          />
          {/* Segments */}
          {data.map((item, index) => {
            const percent = total > 0 ? item.count / total : 0;
            const dashArray = `${percent * circumference} ${circumference}`;
            const dashOffset = -accumulatedPercent * circumference;
            accumulatedPercent += percent;

            return (
              <circle
                key={index}
                cx="90"
                cy="90"
                r={radius}
                fill="transparent"
                stroke={item.color}
                strokeWidth="20"
                strokeDasharray={dashArray}
                strokeDashoffset={dashOffset}
                style={{ transition: 'all 0.5s ease-in-out' }}
              />
            );
          })}
        </svg>

        {/* Center Readout */}
        <div style={{
          position: 'absolute',
          inset: 0,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justify: 'center'
        }}>
          <span style={{ fontSize: '1.8rem', fontWeight: 700, color: 'var(--text)' }}>{total}</span>
          <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Total</span>
        </div>
      </div>

      {/* Chart Legend */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '12px', marginTop: '20px', width: '100%', justifyContent: 'center' }}>
        {data.map((item, index) => {
          const pct = total > 0 ? ((item.count / total) * 100).toFixed(0) : 0;
          return (
            <div key={index} style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.82rem' }}>
              <span style={{ width: '10px', height: '10px', borderRadius: '50%', background: item.color }} />
              <span style={{ color: 'var(--text-muted)' }}>{item.label}:</span>
              <strong>{item.count} ({pct}%)</strong>
            </div>
          );
        })}
      </div>
    </div>
  );
}

/**
 * Interactive Vertical Column Graph Component
 */
function ColumnChart({ title, data, total }) {
  if (!data || data.length === 0) return null;

  const maxCount = Math.max(...data.map(d => d.count), 1);

  return (
    <div style={{
      background: 'var(--card)',
      border: '1px solid var(--border)',
      borderRadius: '16px',
      padding: '24px',
      display: 'flex',
      flexDirection: 'column'
    }}>
      <h3 style={{ fontSize: '1rem', fontWeight: 600, color: 'var(--text)', marginBottom: '24px' }}>
        {title}
      </h3>

      <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-around', height: '160px', borderBottom: '2px solid var(--border)', paddingBottom: '8px' }}>
        {data.map((item, index) => {
          const heightPct = (item.count / maxCount) * 100;
          const sharePct = total > 0 ? ((item.count / total) * 100).toFixed(0) : 0;

          return (
            <div key={index} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', flex: 1, gap: '8px' }}>
              <span style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--text)' }}>
                {item.count} <small style={{ color: 'var(--text-muted)', fontWeight: 400 }}>({sharePct}%)</small>
              </span>
              <div style={{
                width: '36px',
                height: `${Math.max(heightPct, 8)}%`,
                background: item.color,
                borderRadius: '8px 8px 0 0',
                transition: 'height 0.6s cubic-bezier(0.4, 0, 0.2, 1)'
              }} />
              <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', textTransform: 'capitalize', marginTop: '4px' }}>
                {item.label}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

/**
 * Main Reports Component with Tabbed Graph Visuals
 */
export default function AdminReports() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [exportingFormat, setExportingFormat] = useState(null);
  const [activeTab, setActiveTab] = useState('overview');

  useEffect(() => {
    loadReports();
  }, []);

  const loadReports = async () => {
    try {
      setLoading(true);
      setError('');
      const reportsData = await adminApi.reportsSummary();
      setData(reportsData);
    } catch (err) {
      setError(err.message || 'Failed to load reports data');
    } finally {
      setLoading(false);
    }
  };

  const handleExport = async (type = 'summary', format = 'json') => {
    try {
      setExportingFormat(`${type}-${format}`);
      await adminApi.exportReports(type, format);
    } catch (err) {
      setError(err.message || 'Failed to export report');
    } finally {
      setExportingFormat(null);
    }
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount);
  };

  if (loading) {
    return (
      <div className="admin-loading">
        <div className="admin-spinner" />
        Loading reports & visual charts...
      </div>
    );
  }

  if (error) {
    return (
      <div className="admin-content">
        <div className="alert alert-error">{error}</div>
      </div>
    );
  }

  // Prepared Chart Datasets
  const rentalStatusColors = {
    active: '#10b981',
    ended: '#6b7280',
    cancelled: '#ef4444'
  };

  const rentalChartData = (data?.rentals?.byStatus || []).map(r => ({
    label: r.status,
    count: r.count,
    color: rentalStatusColors[r.status] || '#5f8d76'
  }));

  const reqStatusColors = {
    pending: '#f59e0b',
    approved: '#10b981',
    rejected: '#ef4444'
  };

  const reqChartData = (data?.rentalRequests?.byStatus || []).map(r => ({
    label: r.status,
    count: r.count,
    color: reqStatusColors[r.status] || '#3b82f6'
  }));

  const txStatusColors = {
    paid: '#10b981',
    pending: '#f59e0b',
    overdue: '#ef4444',
    failed: '#991b1b'
  };

  const txChartData = (data?.transactions?.byStatus || []).map(t => ({
    label: t.status,
    count: t.count,
    color: txStatusColors[t.status] || '#8b5cf6'
  }));

  const maintStatusColors = {
    submitted: '#f59e0b',
    in_progress: '#3b82f6',
    resolved: '#10b981',
    cancelled: '#6b7280'
  };

  const maintChartData = (data?.maintenance?.byStatus || []).map(m => ({
    label: m.status.replace('_', ' '),
    count: m.count,
    color: maintStatusColors[m.status] || '#6366f1'
  }));

  const priorityColors = {
    low: '#10b981',
    medium: '#3b82f6',
    high: '#f97316',
    urgent: '#dc2626'
  };

  const priorityChartData = (data?.maintenance?.byPriority || []).map(p => ({
    label: p.priority,
    count: p.count,
    color: priorityColors[p.priority] || '#ec4899'
  }));

  const totalTxCount = data?.transactions?.byStatus?.reduce((s, t) => s + t.count, 0) || 0;

  return (
    <div className="admin-content">
      {/* 1. Header with Export Actions */}
      <div className="admin-header">
        <div className="admin-header-title">
          <h1>Reports & Graphical Analytics</h1>
          <p>Visual chart dashboards, percentage donut graphs, and instant data exports</p>
        </div>
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
          <button
            className="admin-action-btn admin-action-btn-secondary"
            onClick={() => handleExport('summary', 'json')}
            disabled={Boolean(exportingFormat)}
          >
            {exportingFormat === 'summary-json' ? 'Exporting...' : '📄 JSON Summary'}
          </button>
          <button
            className="admin-action-btn admin-action-btn-primary"
            onClick={() => handleExport('summary', 'csv')}
            disabled={Boolean(exportingFormat)}
          >
            {exportingFormat === 'summary-csv' ? 'Exporting...' : '📊 CSV Summary'}
          </button>
          <button
            className="admin-action-btn admin-action-btn-primary"
            onClick={() => handleExport('transactions', 'csv')}
            disabled={Boolean(exportingFormat)}
          >
            {exportingFormat === 'transactions-csv' ? 'Exporting...' : '💳 CSV Transactions'}
          </button>
        </div>
      </div>

      {/* 2. Interactive Navigation Tabs */}
      <div style={{
        display: 'flex',
        gap: '8px',
        borderBottom: '2px solid var(--border)',
        marginBottom: '28px',
        paddingBottom: '2px',
        overflowX: 'auto'
      }}>
        <button
          onClick={() => setActiveTab('overview')}
          style={{
            padding: '12px 24px',
            borderRadius: '12px 12px 0 0',
            border: 'none',
            background: activeTab === 'overview' ? 'var(--accent)' : 'transparent',
            color: activeTab === 'overview' ? '#fff' : 'var(--text-muted)',
            fontWeight: 600,
            fontSize: '0.9rem',
            cursor: 'pointer',
            transition: 'all 0.15s'
          }}
        >
          📌 Visual Overview
        </button>
        <button
          onClick={() => setActiveTab('rentals')}
          style={{
            padding: '12px 24px',
            borderRadius: '12px 12px 0 0',
            border: 'none',
            background: activeTab === 'rentals' ? 'var(--accent)' : 'transparent',
            color: activeTab === 'rentals' ? '#fff' : 'var(--text-muted)',
            fontWeight: 600,
            fontSize: '0.9rem',
            cursor: 'pointer',
            transition: 'all 0.15s'
          }}
        >
          🔑 Rental Charts
        </button>
        <button
          onClick={() => setActiveTab('financials')}
          style={{
            padding: '12px 24px',
            borderRadius: '12px 12px 0 0',
            border: 'none',
            background: activeTab === 'financials' ? 'var(--accent)' : 'transparent',
            color: activeTab === 'financials' ? '#fff' : 'var(--text-muted)',
            fontWeight: 600,
            fontSize: '0.9rem',
            cursor: 'pointer',
            transition: 'all 0.15s'
          }}
        >
          💳 Revenue Graphs
        </button>
        <button
          onClick={() => setActiveTab('maintenance')}
          style={{
            padding: '12px 24px',
            borderRadius: '12px 12px 0 0',
            border: 'none',
            background: activeTab === 'maintenance' ? 'var(--accent)' : 'transparent',
            color: activeTab === 'maintenance' ? '#fff' : 'var(--text-muted)',
            fontWeight: 600,
            fontSize: '0.9rem',
            cursor: 'pointer',
            transition: 'all 0.15s'
          }}
        >
          🔧 Maintenance Health
        </button>
      </div>

      {/* 3. VISUAL OVERVIEW TAB */}
      {activeTab === 'overview' && (
        <>
          {/* Top KPI Cards */}
          <div className="admin-cards">
            <div className="admin-card">
              <div className="admin-card-label">Total Users</div>
              <div className="admin-card-value">{data?.users?.total || 0}</div>
              <div className="admin-card-trend">{data?.users?.tenants || 0} Tenants • {data?.users?.owners || 0} Owners</div>
            </div>
            <div className="admin-card">
              <div className="admin-card-label">Total Properties</div>
              <div className="admin-card-value">{data?.properties?.total || 0}</div>
              <div className="admin-card-trend">{data?.properties?.units || 0} Total Units</div>
            </div>
            <div className="admin-card">
              <div className="admin-card-label">Active Leases</div>
              <div className="admin-card-value">{data?.rentals?.active || 0}</div>
              <div className="admin-card-trend positive">Occupied units</div>
            </div>
            <div className="admin-card">
              <div className="admin-card-label">Audited Revenue</div>
              <div className="admin-card-value">{formatCurrency(data?.transactions?.totalRevenue || 0)}</div>
              <div className="admin-card-trend positive">From paid transactions</div>
            </div>
          </div>

          {/* Graphical Donut Charts Row */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '24px' }}>
            <DonutChart
              title="Rental Lease Status Ring Chart"
              data={rentalChartData}
              total={data?.rentals?.total || 0}
            />

            <DonutChart
              title="Transaction Payment Status Donut Chart"
              data={txChartData}
              total={totalTxCount}
            />

            <DonutChart
              title="Maintenance Health Ring Chart"
              data={maintChartData}
              total={data?.maintenance?.total || 0}
            />
          </div>
        </>
      )}

      {/* RENTAL CHARTS TAB */}
      {activeTab === 'rentals' && (
        <>
          <div className="admin-cards">
            <div className="admin-card">
              <div className="admin-card-label">Total Leases</div>
              <div className="admin-card-value">{data?.rentals?.total || 0}</div>
            </div>
            <div className="admin-card">
              <div className="admin-card-label">Active Leases</div>
              <div className="admin-card-value">{data?.rentals?.active || 0}</div>
            </div>
            <div className="admin-card">
              <div className="admin-card-label">Rental Requests</div>
              <div className="admin-card-value">{data?.rentalRequests?.total || 0}</div>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))', gap: '24px' }}>
            <ColumnChart
              title="Rental Status Volume Columns"
              data={rentalChartData}
              total={data?.rentals?.total || 0}
            />

            <DonutChart
              title="Tenant Application Request Statuses"
              data={reqChartData}
              total={data?.rentalRequests?.total || 0}
            />
          </div>
        </>
      )}

      {/* REVENUE GRAPHS TAB */}
      {activeTab === 'financials' && (
        <>
          <div className="admin-cards">
            <div className="admin-card">
              <div className="admin-card-label">Total Settled Revenue</div>
              <div className="admin-card-value">{formatCurrency(data?.transactions?.totalRevenue || 0)}</div>
            </div>
            <div className="admin-card">
              <div className="admin-card-label">Total Transactions</div>
              <div className="admin-card-value">{totalTxCount}</div>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))', gap: '24px' }}>
            <DonutChart
              title="Payment Settlement Donut Graph"
              data={txChartData}
              total={totalTxCount}
            />

            <ColumnChart
              title="Transaction Status Columns"
              data={txChartData}
              total={totalTxCount}
            />
          </div>
        </>
      )}

      {/* MAINTENANCE HEALTH TAB */}
      {activeTab === 'maintenance' && (
        <>
          <div className="admin-cards">
            <div className="admin-card">
              <div className="admin-card-label">Total Maintenance Requests</div>
              <div className="admin-card-value">{data?.maintenance?.total || 0}</div>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))', gap: '24px' }}>
            <ColumnChart
              title="Maintenance Priority Column Graph"
              data={priorityChartData}
              total={data?.maintenance?.total || 0}
            />

            <DonutChart
              title="Maintenance Resolution Status Ring"
              data={maintChartData}
              total={data?.maintenance?.total || 0}
            />
          </div>
        </>
      )}
    </div>
  );
}
