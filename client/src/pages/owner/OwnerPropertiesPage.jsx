import { PageHeader } from '../../components/ownerUi';

/**
 * Placeholder for Person 2's Properties module (property CRUD, status, etc.).
 * Import CSV (Person 3) writes into the same `properties` table, so anything
 * imported shows up here once Person 2's page is built.
 */
export default function OwnerPropertiesPage() {
  return (
    <div className="page">
      <PageHeader title="Properties" subtitle="Your property portfolio." />
      <div className="state-block">
        <div className="state-icon">🏠</div>
        <h3>Properties module</h3>
        <p>This page is being built by another team member. Properties imported via CSV are already stored and will appear here.</p>
      </div>
    </div>
  );
}
