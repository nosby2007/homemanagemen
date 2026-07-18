import assert = require('node:assert/strict');
import test = require('node:test');
import {
  requireCommissionScope,
  requireDocumentScope,
  requireLeaseScope,
  requireMaintenanceScope,
  requireOfferScope,
  requirePaymentScope,
  requireShowingScope,
  requireTransactionScope,
} from '../../src/app/core/utils/property-scope';

test('requireLeaseScope enforces property, tenant, and unit ids', () => {
  assert.deepEqual(
    requireLeaseScope({ propertyId: ' property-1 ', tenantId: ' tenant-1 ', unitId: ' unit-1 ' }),
    { propertyId: 'property-1', tenantId: 'tenant-1', unitId: 'unit-1' },
  );

  assert.throws(() => requireLeaseScope({ propertyId: 'property-1', tenantId: 'tenant-1' }), /unit/i);
});

test('requirePaymentScope rejects floating payments', () => {
  assert.throws(
    () => requirePaymentScope({ propertyId: 'property-1', leaseId: 'lease-1', tenantId: 'tenant-1' }),
    /unitId/i,
  );
});

test('requireDocumentScope enforces category-specific links', () => {
  assert.throws(
    () => requireDocumentScope({ propertyId: 'property-1', category: 'lease', visibility: 'private' }),
    /lease/i,
  );

  assert.throws(
    () => requireDocumentScope({ propertyId: 'property-1', category: 'id', visibility: 'tenant' }),
    /tenant/i,
  );
});

test('requireMaintenanceScope enforces property boundary for tenant requests', () => {
  assert.throws(
    () => requireMaintenanceScope({ title: 'Repair sink', propertyId: 'property-1', tenantId: 'tenant-1' }),
    /unit/i,
  );
});

test('sales scope helpers reject org-wide floating records', () => {
  assert.deepEqual(
    requireOfferScope({ propertyId: 'property-1', listingId: 'listing-1', buyerId: 'buyer-1' }),
    { propertyId: 'property-1', listingId: 'listing-1', buyerId: 'buyer-1' },
  );

  assert.throws(() => requireShowingScope({ listingId: 'listing-1', clientId: 'client-1' }), /property/i);
  assert.throws(() => requireTransactionScope({ listingId: 'listing-1' }), /property/i);
  assert.throws(() => requireCommissionScope({}), /transaction/i);
});
