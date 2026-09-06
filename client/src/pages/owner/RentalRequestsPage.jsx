import { PageHeader } from '../../components/ownerUi';

/** Placeholder for Person 2's Rental Requests module. */
export default function RentalRequestsPage() {
  return (
    <div className="page">
      <PageHeader title="Rental Requests" subtitle="Requests from tenants to rent your properties." />
      <div className="state-block">
        <div className="state-icon">📥</div>
        <h3>Rental Requests module</h3>
        <p>This page is being built by another team member. Once you accept a request there, the tenant appears on the Rent page.</p>
      </div>
    </div>
  );
}
