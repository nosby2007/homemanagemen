type ScopePayload = Record<string, unknown>;

function normalizeId(value: unknown): string | undefined {
  const normalized = String(value ?? '').trim();
  return normalized || undefined;
}

function requireId(value: unknown, message: string): string {
  const normalized = normalizeId(value);
  if (!normalized) throw new Error(message);
  return normalized;
}

export function requireLeaseScope(payload: { propertyId?: unknown; tenantId?: unknown; unitId?: unknown }) {
  return {
    propertyId: requireId(payload.propertyId, 'Lease must be created under a property.'),
    tenantId: requireId(payload.tenantId, 'Lease must be linked to a tenant.'),
    unitId: requireId(payload.unitId, 'Lease must be linked to a unit.'),
  };
}

export function requirePaymentScope(payload: {
  propertyId?: unknown;
  leaseId?: unknown;
  tenantId?: unknown;
  unitId?: unknown;
}) {
  return {
    propertyId: requireId(payload.propertyId, 'Payment must be created under a property.'),
    leaseId: requireId(payload.leaseId, 'Payment must be created under a lease.'),
    tenantId: requireId(payload.tenantId, 'Payment must include a tenantId.'),
    unitId: requireId(payload.unitId, 'Payment must include a unitId.'),
  };
}

export function requireDocumentScope(payload: {
  propertyId?: unknown;
  tenantId?: unknown;
  leaseId?: unknown;
  category?: unknown;
  visibility?: unknown;
}) {
  const propertyId = requireId(payload.propertyId, 'Document must be linked to a property.');
  const tenantId = normalizeId(payload.tenantId);
  const leaseId = normalizeId(payload.leaseId);
  const visibility = requireId(payload.visibility, 'Document visibility is required.') as NonNullable<string>;
  const category = requireId(payload.category, 'Document category is required.');

  if (category === 'lease' && !leaseId) {
    throw new Error('Lease documents must be linked to a lease.');
  }

  if (category === 'id' && !tenantId) {
    throw new Error('ID documents must be linked to a tenant.');
  }

  return { propertyId, tenantId, leaseId, category, visibility };
}

export function requireMaintenanceScope(payload: {
  title?: unknown;
  propertyId?: unknown;
  tenantId?: unknown;
  unitId?: unknown;
}) {
  const title = requireId(payload.title, 'Maintenance request title is required.');
  const propertyId = requireId(payload.propertyId, 'Maintenance request must be linked to a property.');
  const tenantId = normalizeId(payload.tenantId);
  const unitId = normalizeId(payload.unitId);

  if (tenantId && !unitId) {
    throw new Error('Tenant maintenance request must be linked to a unit.');
  }

  return { title, propertyId, tenantId, unitId };
}

export function requireOfferScope(payload: ScopePayload) {
  return {
    propertyId: requireId(payload['propertyId'], 'Offer must be linked to a property.'),
    listingId: requireId(payload['listingId'], 'Offer must be linked to a listing.'),
    buyerId: requireId(payload['buyerId'], 'Offer must be linked to a buyer.'),
  };
}

export function requireShowingScope(payload: ScopePayload) {
  return {
    propertyId: requireId(payload['propertyId'], 'Showing must be linked to a property.'),
    listingId: requireId(payload['listingId'], 'Showing must be linked to a listing.'),
    clientId: requireId(payload['clientId'], 'Showing must be linked to a client.'),
  };
}

export function requireTransactionScope(payload: ScopePayload) {
  return {
    propertyId: requireId(payload['propertyId'], 'Transaction must be linked to a property.'),
  };
}

export function requireCommissionScope(payload: ScopePayload) {
  return {
    transactionId: requireId(payload['transactionId'], 'Commission must be linked to a transaction.'),
  };
}
