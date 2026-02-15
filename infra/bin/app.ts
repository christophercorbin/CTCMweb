#!/usr/bin/env node
import 'source-map-support/register'
import * as cdk from 'aws-cdk-lib'
import { NetworkStack } from '../lib/stacks/network-stack'
import { AuthStack } from '../lib/stacks/auth-stack'
import { DataStack } from '../lib/stacks/data-stack'
import { ApiStack } from '../lib/stacks/api-stack'
import { AmplifyFrontendStack } from '../lib/stacks/amplify-frontend-stack'
import { OcrStack } from '../lib/stacks/ocr-stack'
import { ObservabilityStack } from '../lib/stacks/observability-stack'

const app = new cdk.App()

// Environment configuration
const env = {
  account: '404875533723',
  region: 'us-east-1',
}

// Common tags for all resources
const tags = {
  Environment: 'dev',
  Application: 'ctcm',
  ManagedBy: 'cdk',
  Owner: 'christopher-corbin',
  CostCenter: 'ctcm-dev',
}

// Stack naming prefix
const stackPrefix = 'CtcmDev'

// Network Stack - VPC, Security Groups
const networkStack = new NetworkStack(app, `${stackPrefix}NetworkStack`, {
  env,
  description: 'CTCM Network infrastructure - VPC, subnets, security groups',
  tags,
})

// Auth Stack - Cognito User Pool
const authStack = new AuthStack(app, `${stackPrefix}AuthStack`, {
  env,
  description: 'CTCM Authentication - Cognito User Pool and groups',
  tags,
})

// Data Stack - RDS, S3 Buckets
const dataStack = new DataStack(app, `${stackPrefix}DataStack`, {
  env,
  description: 'CTCM Data layer - RDS PostgreSQL and S3 buckets',
  tags,
  vpc: networkStack.vpc,
  lambdaSecurityGroup: networkStack.lambdaSecurityGroup,
  databaseSecurityGroup: networkStack.databaseSecurityGroup,
})

// API Stack - API Gateway, Lambda Functions
const apiStack = new ApiStack(app, `${stackPrefix}ApiStack`, {
  env,
  description: 'CTCM API layer - API Gateway and Lambda functions',
  tags,
  vpc: networkStack.vpc,
  lambdaSecurityGroup: networkStack.lambdaSecurityGroup,
  userPool: authStack.userPool,
  databaseSecret: dataStack.databaseSecret,
  documentBucket: dataStack.documentBucket,
})

// Amplify Frontend Stack - Amplify Hosting
const amplifyFrontendStack = new AmplifyFrontendStack(app, `${stackPrefix}AmplifyFrontendStack`, {
  env,
  description: 'CTCM Frontend hosting - AWS Amplify',
  tags,
  apiUrl: apiStack.apiUrl,
  cognitoUserPoolId: authStack.userPool.userPoolId,
  cognitoClientId: authStack.userPoolClient.userPoolClientId,
  githubRepo: 'christophercorbin/CTCMweb',
  githubBranch: 'main',
})

// OCR Stack - Textract, Step Functions
const ocrStack = new OcrStack(app, `${stackPrefix}OcrStack`, {
  env,
  description: 'CTCM OCR pipeline - Textract and Step Functions',
  tags,
  vpc: networkStack.vpc,
  lambdaSecurityGroup: networkStack.lambdaSecurityGroup,
  documentBucket: dataStack.documentBucket,
  databaseSecret: dataStack.databaseSecret,
})

// Observability Stack - CloudWatch, X-Ray
const observabilityStack = new ObservabilityStack(app, `${stackPrefix}ObservabilityStack`, {
  env,
  description: 'CTCM Observability - CloudWatch dashboards and alarms',
  tags,
  apiGateway: apiStack.api,
  lambdaFunctions: apiStack.lambdaFunctions,
  database: dataStack.database,
})

app.synth()
