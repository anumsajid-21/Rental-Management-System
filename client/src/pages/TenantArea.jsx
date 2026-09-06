import AreaPlaceholder from '../components/AreaPlaceholder';
import { useAuth } from '../context/AuthContext';

export default function TenantArea() {
  const { user } = useAuth();
  return <AreaPlaceholder title="Tenant Area" user={user} />;
}
