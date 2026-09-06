/**
 * Central role definitions.
 * The system is extensible: adding `admin` here (already defined) is all
 * that is needed for future admin support — no component changes required.
 */
export const ROLES = {
  ADMIN: 'admin',
  PROPERTY_OWNER: 'property_owner',
  TENANT: 'tenant',
};

/** Roles available during public sign-up (admin excluded by design). */
export const PUBLIC_SIGNUP_ROLES = [
  {
    value: ROLES.TENANT,
    label: 'Tenant',
    description: 'For users looking to rent a property.',
  },
  {
    value: ROLES.PROPERTY_OWNER,
    label: 'Property Owner',
    description: 'For users managing/renting out properties.',
  },
];

/** Landing route per role. Admin points to a future foundation route. */
export const ROLE_HOME = {
  [ROLES.TENANT]: '/tenant',
  [ROLES.PROPERTY_OWNER]: '/owner',
  [ROLES.ADMIN]: '/admin',
};
