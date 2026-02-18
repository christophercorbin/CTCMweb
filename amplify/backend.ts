import { defineBackend } from '@aws-amplify/backend';

/**
 * Amplify Gen 2 Backend Definition for CTCM Freight Forwarding Application
 * 
 * This file defines the backend resources for the CTCM application.
 * Resources are imported from their respective directories and wired together here.
 * 
 * Migration Phases:
 * - Phase 1: Project initialization (current)
 * - Phase 2: Authentication (auth/)
 * - Phase 3: Storage (storage/)
 * - Phase 4: API Functions (functions/)
 * - Phase 5: Frontend Hosting
 * - Phase 6: OCR Pipeline
 * 
 * Environment: dev
 * Region: us-east-1
 * Budget: $15/month target
 */

// Import resources as they are implemented
import { auth } from './auth/resource';
import { storage } from './storage/resource';
import { shipmentsFunction } from './functions/shipments/resource';
import { customersFunction } from './functions/customers/resource';
import { invoicesFunction } from './functions/invoices/resource';
import { documentsFunction } from './functions/documents/resource';
import { searchFunction } from './functions/search/resource';
// import { ocrFunction } from './functions/ocr/resource';

/**
 * Define the backend with all resources
 * Resources are added incrementally during migration phases
 */
const backend = defineBackend({
  // Phase 2: Authentication
  auth,
  
  // Phase 3: Storage
  storage,
  
  // Phase 4: API Functions
  shipmentsFunction,
  customersFunction,
  invoicesFunction,
  documentsFunction,
  searchFunction,
  
  // Phase 6: OCR Pipeline
  // ocrFunction,
});

// Database configuration (shared across all functions)
const databaseConfig = {
  secretArn: process.env.DATABASE_SECRET_ARN || '',
};

// Add database environment variables to all functions
const functions = [
  backend.shipmentsFunction,
  backend.customersFunction,
  backend.invoicesFunction,
  backend.documentsFunction,
  backend.searchFunction,
];

for (const func of functions) {
  func.addEnvironment('DATABASE_SECRET_ARN', databaseConfig.secretArn);
}

// Configure S3 trigger for OCR function (Phase 6)
// backend.storage.bucket.addEventNotification(
//   s3.EventType.OBJECT_CREATED,
//   new s3n.LambdaDestination(backend.ocrFunction.resource),
//   { prefix: 'receipts/' }
// );

export default backend;
