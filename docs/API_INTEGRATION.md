# Frontend API Integration

This document describes the frontend integration with the AWS API Gateway backend.

## Overview

The frontend has been updated to connect to the real AWS API Gateway instead of using mock data. All API calls now go through the deployed Lambda functions backed by RDS PostgreSQL.

## Configuration

### Environment Variables

The `.env` file contains the API Gateway URL and other AWS configuration:

```env
VITE_API_URL=https://1y447zjdhj.execute-api.us-east-1.amazonaws.com/dev
VITE_AWS_REGION=us-east-1
VITE_COGNITO_USER_POOL_ID=us-east-1_n8pWlYcSS
VITE_COGNITO_CLIENT_ID=7fotk98fhtt003lf9d1728d49g
```

## API Client

### Base Configuration (`src/api/axios.ts`)

The API client is configured with:
- Base URL from environment variable
- Automatic JWT token injection via request interceptor
- Error handling via response interceptor
- Automatic redirect to login on 401 errors

### API Services (`src/api/services.ts`)

Comprehensive API service layer with typed methods for:

#### Customer API
- `getAll()` - Get all customers (admin) or current customer (customer user)
- `getById(id)` - Get customer by ID
- `create(data)` - Create new customer (admin only)
- `update(id, data)` - Update customer (admin only)

#### Shipment API
- `getAll(filters?)` - Get shipments with optional filters (status, customerId, dates)
- `getById(id)` - Get shipment details with packages, charges, and events
- `create(data)` - Create new shipment (admin only)
- `update(id, data)` - Update shipment (admin only)

#### Search API
- `search(query, pagination?)` - Full-text search across shipments

#### Document API
- `getAll(filters?)` - Get documents with optional filters
- `getById(id)` - Get presigned URL for document download
- `upload(file, metadata)` - Upload document to S3
- `delete(id)` - Delete document

#### Invoice API
- `getAll(filters?)` - Get invoices with optional filters
- `getById(id)` - Get invoice by ID
- `create(data)` - Create new invoice (admin only)
- `update(id, data)` - Update invoice (admin only)

## Authentication

### JWT Token Flow

1. User authenticates via Cognito (see `src/lib/cognito.ts`)
2. Cognito returns JWT access token
3. API client automatically includes token in `Authorization` header
4. API Gateway validates token and extracts user context
5. Lambda functions enforce tenant isolation based on user role

### User Roles

- **Admin**: Full access to all resources across all customers
- **Customer**: Access restricted to their own data (tenant isolation)

## Hooks

### `useRealtimeShipments`

Hook for fetching and managing shipments with automatic polling:

```typescript
const { shipments, loading, error } = useRealtimeShipments(customerId?)
```

- Fetches shipments from API Gateway
- Automatically polls every 30 seconds for updates
- Filters by customerId if provided (optional)
- For customer users, API automatically filters by their tenant ID

## Data Model Differences

The frontend types have been updated to match the backend schema:

### Removed Properties (from mock data)
- `origin` - Use `shipper_name` and `shipper_address` instead
- `destination` - Use `consignee_name` and `consignee_address` instead
- `shipping_method` - Not in current schema
- `weight` - Use `packages[].weight_kg` instead
- `delivery_method` - Not in current schema
- `delivery_address` - Use `consignee_address` instead

### Key Properties
- `tracking_number` - Unique tracking identifier
- `warehouse_receipt_number` - Warehouse receipt reference
- `customer_id` - Customer UUID
- `status` - Shipment status (received, processing, ready, shipped, delivered)
- `shipper_name`, `shipper_address` - Shipper information
- `consignee_name`, `consignee_address` - Consignee information
- `carrier_name` - Carrier information
- `warehouse_location` - Current warehouse location
- `packages[]` - Array of packages with dimensions and weights
- `charges[]` - Array of charges (freight, handling, storage, etc.)
- `events[]` - Array of shipment events (timeline)

## Updated Pages

### Customer Dashboard (`src/pages/CustomerDashboard.tsx`)
- Uses `useRealtimeShipments` hook to fetch shipments
- Automatically filtered by customer's tenant ID via API
- Removed mock data usage

### Admin Dashboard (`src/pages/AdminDashboard.tsx`)
- Uses `shipmentApi.getAll()` to fetch all shipments
- Updated table columns to use actual schema fields
- Removed shipping method filter (not in schema)

### Shipment Details (`src/pages/ShipmentDetails.tsx`)
- Uses `shipmentApi.getById()` to fetch shipment details
- Uses `documentApi.upload()` for invoice uploads
- Displays shipper/consignee instead of origin/destination
- Calculates total weight from packages

## Testing

To test the API integration:

1. Ensure the API Gateway is deployed and accessible
2. Ensure you have valid Cognito credentials
3. Start the frontend dev server: `npm run dev`
4. Login with Cognito credentials
5. Navigate to dashboard to see real shipments from RDS

## Troubleshooting

### 401 Unauthorized
- Check that Cognito tokens are valid
- Check that API Gateway authorizer is configured correctly
- Check browser console for token errors

### CORS Errors
- Ensure API Gateway has CORS enabled for the frontend origin
- Check that preflight OPTIONS requests are handled

### Empty Data
- Check that database has been seeded with test data
- Check CloudWatch Logs for Lambda errors
- Verify tenant isolation is working correctly

### Network Errors
- Verify API Gateway URL is correct in `.env`
- Check that API Gateway is deployed and accessible
- Check browser network tab for failed requests

## Next Steps

### Phase 4: Real-Time Updates
- Replace polling with EventBridge + WebSocket or AppSync subscriptions
- Implement real-time status updates for shipments
- Add notifications for shipment events

### Phase 5: OCR Integration
- Integrate warehouse receipt OCR processing
- Display OCR results in UI
- Allow manual correction of OCR data

### Testing
- Add integration tests for API calls
- Add E2E tests for critical user flows
- Add error handling tests
