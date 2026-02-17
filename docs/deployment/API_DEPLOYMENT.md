# API Stack Deployment Summary

## Deployment Date
February 16, 2026

## What Was Deployed

### API Gateway
- **API ID**: 1y447zjdhj
- **Base URL**: https://1y447zjdhj.execute-api.us-east-1.amazonaws.com/dev/
- **Stage**: dev
- **Region**: us-east-1
- **Authentication**: Cognito JWT Authorizer
- **CORS**: Enabled for all origins (development mode)
- **Tracing**: X-Ray enabled
- **Logging**: CloudWatch Logs enabled (INFO level)

### Lambda Functions

#### 1. Customers Function
- **Function Name**: ctcm-dev-customers
- **Runtime**: Node.js 18.x
- **Memory**: 512 MB
- **Timeout**: 30 seconds
- **Handler**: apps/api/src/handlers/customers.ts
- **Endpoints**:
  - `GET /customers` - List all customers (admin) or own customer (customer role)
  - `GET /customers/{id}` - Get customer by ID
  - `POST /customers` - Create new customer
  - `PUT /customers/{id}` - Update customer

#### 2. Shipments Function
- **Function Name**: ctcm-dev-shipments
- **Runtime**: Node.js 18.x
- **Memory**: 512 MB
- **Timeout**: 30 seconds
- **Handler**: apps/api/src/handlers/shipments.ts
- **Endpoints**:
  - `GET /shipments` - List shipments with filters (status, customer, date range, search)
  - `GET /shipments/{id}` - Get shipment by ID or tracking number
  - `POST /shipments` - Create new shipment
  - `PUT /shipments/{id}` - Update shipment

### Environment Variables
Both Lambda functions have:
- `DB_SECRET_ARN`: arn:aws:secretsmanager:us-east-1:404875533723:secret:ctcm-dev-database-credentials-ILCn3F
- `DOCUMENT_BUCKET_NAME`: ctcm-dev-documents-404875533723
- `NODE_ENV`: production
- `AWS_REGION`: us-east-1

### IAM Permissions
- Lambda functions have read access to database credentials secret
- Lambda functions have CloudWatch Logs write permissions
- Lambda functions have X-Ray write permissions

## Testing the API

### Prerequisites
1. You need a valid Cognito JWT token
2. The token must be included in the `Authorization` header

### Example: Create a Cognito User
```bash
# Create a user in Cognito
aws cognito-idp admin-create-user \
  --user-pool-id us-east-1_zqM1VNIn3 \
  --username admin@ctcm.com \
  --user-attributes Name=email,Value=admin@ctcm.com Name=email_verified,Value=true \
  --temporary-password TempPass123! \
  --message-action SUPPRESS \
  --profile kiro-ctcm-dev-admin

# Add user to admin group
aws cognito-idp admin-add-user-to-group \
  --user-pool-id us-east-1_zqM1VNIn3 \
  --username admin@ctcm.com \
  --group-name admin \
  --profile kiro-ctcm-dev-admin

# Set permanent password
aws cognito-idp admin-set-user-password \
  --user-pool-id us-east-1_zqM1VNIn3 \
  --username admin@ctcm.com \
  --password AdminPass123! \
  --permanent \
  --profile kiro-ctcm-dev-admin
```

### Example: Get JWT Token
```bash
# Authenticate and get tokens
aws cognito-idp initiate-auth \
  --auth-flow USER_PASSWORD_AUTH \
  --client-id 3h9u26uesvgc019813nb3dufpq \
  --auth-parameters USERNAME=admin@ctcm.com,PASSWORD=AdminPass123! \
  --profile kiro-ctcm-dev-admin
```

### Example: Test API Endpoints
```bash
# Set your JWT token
export JWT_TOKEN="your-id-token-here"

# Test customers endpoint
curl -X GET \
  https://1y447zjdhj.execute-api.us-east-1.amazonaws.com/dev/customers \
  -H "Authorization: Bearer $JWT_TOKEN"

# Test shipments endpoint
curl -X GET \
  https://1y447zjdhj.execute-api.us-east-1.amazonaws.com/dev/shipments \
  -H "Authorization: Bearer $JWT_TOKEN"

# Create a customer
curl -X POST \
  https://1y447zjdhj.execute-api.us-east-1.amazonaws.com/dev/customers \
  -H "Authorization: Bearer $JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "userId": "user-123",
    "name": "Test Customer",
    "email": "test@example.com",
    "phone": "+1234567890"
  }'

# Create a shipment
curl -X POST \
  https://1y447zjdhj.execute-api.us-east-1.amazonaws.com/dev/shipments \
  -H "Authorization: Bearer $JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "customerId": "customer-id-here",
    "shipperName": "Test Shipper",
    "consigneeName": "Test Consignee"
  }'
```

## Next Steps

### 1. Update Frontend (Task 4.31)
The frontend needs to be updated to use the new API Gateway endpoint instead of Supabase:

1. Update API client base URL to: `https://1y447zjdhj.execute-api.us-east-1.amazonaws.com/dev/`
2. Update authentication to use Cognito tokens
3. Test all frontend features with the new API

### 2. Implement Remaining Handlers (Optional for MVP)
- Task 4.19: Search Lambda handler
- Task 4.22: Documents Lambda handler
- Task 4.25: Invoices Lambda handler

### 3. Data Migration (Task 4.32)
Migrate existing data from Supabase to RDS PostgreSQL

### 4. Integration Testing (Task 4.33)
Write integration tests for the deployed API endpoints

## Known Limitations

1. **No VPC Integration**: Lambda functions are not in VPC because the RDS database is publicly accessible (development mode). For production, this should be changed.

2. **CORS Wide Open**: CORS is configured to allow all origins. For production, this should be restricted to the frontend domain.

3. **No Rate Limiting**: API Gateway has no rate limiting configured. Consider adding usage plans for production.

4. **No WAF**: No Web Application Firewall is configured. This should be added for production.

5. **Missing Handlers**: Search, documents, and invoices handlers are not yet implemented.

## Troubleshooting

### Lambda Function Logs
```bash
# View customers function logs
aws logs tail /aws/lambda/ctcm-dev-customers --follow --profile kiro-ctcm-dev-admin

# View shipments function logs
aws logs tail /aws/lambda/ctcm-dev-shipments --follow --profile kiro-ctcm-dev-admin
```

### Check Lambda Function Status
```bash
# Get customers function info
aws lambda get-function --function-name ctcm-dev-customers --profile kiro-ctcm-dev-admin

# Get shipments function info
aws lambda get-function --function-name ctcm-dev-shipments --profile kiro-ctcm-dev-admin
```

### Test Lambda Functions Directly
```bash
# Invoke customers function
aws lambda invoke \
  --function-name ctcm-dev-customers \
  --payload '{"httpMethod":"GET","path":"/customers","headers":{},"queryStringParameters":null}' \
  --profile kiro-ctcm-dev-admin \
  response.json

cat response.json
```

## Cost Estimate

### API Gateway
- $3.50 per million requests
- First 1 million requests per month: ~$3.50
- Estimated monthly cost: $1-5 (development usage)

### Lambda
- $0.20 per 1 million requests
- $0.0000166667 per GB-second
- 512 MB, 30s timeout, 1000 requests/day
- Estimated monthly cost: $2-5

### CloudWatch Logs
- $0.50 per GB ingested
- $0.03 per GB stored
- 2-week retention
- Estimated monthly cost: $1-3

### Total Estimated Cost
**$4-13 per month** for API layer (well within $15/month budget)

## Resources

- [API Gateway Documentation](https://docs.aws.amazon.com/apigateway/)
- [Lambda Documentation](https://docs.aws.amazon.com/lambda/)
- [Cognito Documentation](https://docs.aws.amazon.com/cognito/)
- [CDK API Reference](https://docs.aws.amazon.com/cdk/api/v2/)
