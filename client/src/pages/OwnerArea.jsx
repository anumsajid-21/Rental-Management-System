import AreaPlaceholder from '../components/AreaPlaceholder';
import { useAuth } from '../context/AuthContext';

export default function OwnerArea() {
  const { user } = useAuth();
  return <AreaPlaceholder title="Property Owner Area" user={user} />;
}
