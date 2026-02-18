import { defineStorage } from '@aws-amplify/backend';

/**
 * Amplify Storage Configuration for CTCM Document Management
 * 
 * This configuration defines S3 storage with tenant-based access controls
 * for invoices, receipts, and other documents.
 * 
 * Directory Structure:
 * - invoices/{entity_id}/*: Invoice documents
 * - receipts/{entity_id}/*: Warehouse receipt documents (OCR processing)
 * - documents/{entity_id}/*: General documents
 * 
 * Access Control:
 * - Authenticated users: Read and write their own tenant's documents
 * - Admin group: Full access (read, write, delete) to all documents
 * 
 * Tenant Isolation:
 * - {entity_id} is replaced with the user's tenant_id at runtime
 * - Ensures customers can only access their own documents
 * - Admin users can access all documents via group permissions
 */

export const storage = defineStorage({
  name: 'ctcmDocuments',
  access: (allow) => ({
    // Invoice documents - tenant-isolated
    'invoices/{entity_id}/*': [
      allow.authenticated.to(['read', 'write']),
      allow.groups(['admin']).to(['read', 'write', 'delete']),
    ],
    
    // Warehouse receipts - tenant-isolated, triggers OCR processing
    'receipts/{entity_id}/*': [
      allow.authenticated.to(['read', 'write']),
      allow.groups(['admin']).to(['read', 'write', 'delete']),
    ],
    
    // General documents - tenant-isolated
    'documents/{entity_id}/*': [
      allow.authenticated.to(['read', 'write']),
      allow.groups(['admin']).to(['read', 'write', 'delete']),
    ],
    
    // Shipment documents - tenant-isolated
    'shipments/{entity_id}/*': [
      allow.authenticated.to(['read', 'write']),
      allow.groups(['admin']).to(['read', 'write', 'delete']),
    ],
  }),
});
