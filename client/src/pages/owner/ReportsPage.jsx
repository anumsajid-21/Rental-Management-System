import { useEffect, useState } from 'react';
import { useOwnerApi } from '../../lib/ownerApi';
import { PageHeader, StatCard, Loading, ErrorState, money } from '../../components/ownerUi';
import { TrendChart, DonutChart, BarChart, ChartLegend, chartColor } from '../../components/charts';

const label = (s) => String(s || '').replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
const shortMoney = (n) => (n >= 1000 ? `${Math.round(n / 1000)}k` : String(n));

export default function ReportsPage() {
  const api = useOwnerApi();
  const [report, setReport] = useState(null);
  const [error, setError] = useState('');

  const load = async () => {
    setError('');
    const result = await api.get('/reports');
    if (!result.ok) { setError(result.error); return; }
    setReport(result);
  };

  useEffect(() => { load(); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  if (error) return <div className="page"><PageHeader title="Reports" /><ErrorState message={error} onRetry={load} /></div>;
  if (!report) return <div className="page"><PageHeader title="Reports" /><Loading label="Building your report…" /></div>;

  const { report: r, charts } = report;
  const propRows = charts.propertyStatus.map((s) => ({ label: label(s.status), key: s.status, value: s.count }));
  const typeRows = charts.propertyTypes.map((t) => ({ label: label(t.type), key: t.type, value: t.count }));
  const maintRows = charts.maintenanceByStatus.map((m) => ({ label: label(m.status), key: m.status, value: m.count }));
  const prioRows = charts.maintenanceByPriority.map((m) => ({ label: label(m.priority), key: m.priority, value: m.count }));

  return (
    <div className="page">
      <PageHeader title="Reports" subtitle="A live visual summary of your portfolio, computed from the database." />

      <section className="card">
        <h2 className="card-title">Revenue</h2>
        <div className="stat-grid">
          <StatCard label="Total Rent" value={money(r.revenue.totalRent)} tone="info" />
          <StatCard label="Paid Rent" value={money(r.revenue.paidRent)} tone="success" />
          <StatCard label="Pending Rent" value={money(r.revenue.pendingRent)} tone="warning" />
          <StatCard label="Overdue Rent" value={money(r.revenue.overdueRent)} tone="danger" />
        </div>
      </section>

      <section className="card">
        <h2 className="card-title">Revenue Trend — last 6 months</h2>
        <TrendChart data={charts.revenueTrend} format={shortMoney} />
        <ChartLegend items={[
          { label: 'Collected', color: chartColor('resolved') },
          { label: 'Outstanding (pending + overdue)', color: chartColor('submitted') },
        ]} />
      </section>

      <div className="chart-grid-two">
        <section className="card">
          <h2 className="card-title">Property Status Distribution</h2>
          <DonutChart rows={propRows} />
        </section>
        <section className="card">
          <h2 className="card-title">Property Types</h2>
          <BarChart rows={typeRows} />
        </section>
      </div>

      <section className="card">
        <h2 className="card-title">Maintenance</h2>
        <div className="stat-grid">
          <StatCard label="Total Requests" value={r.maintenance.total} />
          <StatCard label="Submitted" value={r.maintenance.submitted} tone="warning" />
          <StatCard label="In Progress" value={r.maintenance.inProgress} tone="info" />
          <StatCard label="Resolved" value={r.maintenance.resolved} tone="success" />
        </div>
        <div className="chart-grid-two chart-grid-two-inner">
          <div>
            <h3 className="chart-subtitle">By status</h3>
            <BarChart rows={maintRows} />
          </div>
          <div>
            <h3 className="chart-subtitle">By priority</h3>
            <BarChart rows={prioRows} />
          </div>
        </div>
      </section>

      <section className="card">
        <h2 className="card-title">Rentals &amp; Tenants</h2>
        <div className="stat-grid">
          <StatCard label="Total Tenants" value={r.tenants.totalTenants} />
          <StatCard label="Active Tenants" value={r.tenants.activeTenants} tone="success" />
          <StatCard label="Pending Rental Requests" value={r.tenants.pendingRequests} tone="warning" />
          <StatCard label="Active Monthly Income" value={money(charts.rentals.monthlyIncome)} tone="info" hint="from active rentals" />
        </div>
        <DonutChart rows={[
          { label: 'Active rentals', key: 'active', value: charts.rentals.active },
          { label: 'Pending requests', key: 'submitted', value: charts.rentals.pending },
          { label: 'Ended rentals', key: 'inactive', value: charts.rentals.ended },
        ]} />
      </section>
    </div>
  );
}

