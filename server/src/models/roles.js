/** Role constants — shared source of truth on the server. */
export const ROLES = {
  ADMIN: 'admin',
  PROPERTY_OWNER: 'property_owner',
  TENANT: 'tenant',
};

/** Roles allowed during public sign-up (admin excluded by design). */
export const PUBLIC_SIGNUP_ROLES = Object.values(ROLES).filter((r) => r !== ROLES.ADMIN);
