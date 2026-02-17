import * as cdk from 'aws-cdk-lib'
import * as ec2 from 'aws-cdk-lib/aws-ec2'
import * as cognito from 'aws-cdk-lib/aws-cognito'
import * as secretsmanager from 'aws-cdk-lib/aws-secretsmanager'
import * as s3 from 'aws-cdk-lib/aws-s3'
import * as apigateway from 'aws-cdk-lib/aws-apigateway'
import * as lambda from 'aws-cdk-lib/aws-lambda'
import * as nodejs from 'aws-cdk-lib/aws-lambda-nodejs'
import * as logs from 'aws-cdk-lib/aws-logs'
import { Construct } from 'constructs'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

export interface ApiStackProps extends cdk.StackProps {
  vpc: ec2.IVpc
  lambdaSecurityGroup: ec2.SecurityGroup
  userPool: cognito.UserPool
  databaseSecret: secretsmanager.ISecret
  documentBucket: s3.Bucket
}

export class ApiStack extends cdk.Stack {
  public readonly api: apigateway.RestApi
  public readonly apiUrl: string
  public readonly lambdaFunctions: lambda.Function[]

  constructor(scope: Construct, id: string, props: ApiStackProps) {
    super(scope, id, props)

    this.lambdaFunctions = []

    // API Gateway REST API
    this.api = new apigateway.RestApi(this, 'Api', {
      restApiName: 'ctcm-dev-api',
      description: 'CTCM Freight Forwarding API',
      deployOptions: {
        stageName: 'dev',
        tracingEnabled: true,
        loggingLevel: apigateway.MethodLoggingLevel.INFO,
        dataTraceEnabled: true,
        metricsEnabled: true,
      },
      defaultCorsPreflightOptions: {
        allowOrigins: apigateway.Cors.ALL_ORIGINS,
        allowMethods: apigateway.Cors.ALL_METHODS,
        allowHeaders: ['Content-Type', 'Authorization'],
        allowCredentials: true,
      },
    })

    this.apiUrl = this.api.url

    // JWT Authorizer using Cognito
    const authorizer = new apigateway.CognitoUserPoolsAuthorizer(this, 'Authorizer', {
      cognitoUserPools: [props.userPool],
      authorizerName: 'CognitoAuthorizer',
      identitySource: 'method.request.header.Authorization',
    })

    // Common Lambda environment variables
    const commonEnv = {
      DB_SECRET_ARN: props.databaseSecret.secretArn,
      DOCUMENT_BUCKET_NAME: props.documentBucket.bucketName,
      NODE_ENV: 'production',
    }

    // Common Lambda configuration
    const commonLambdaProps = {
      runtime: lambda.Runtime.NODEJS_18_X,
      timeout: cdk.Duration.seconds(30),
      memorySize: 512,
      environment: commonEnv,
      logRetention: logs.RetentionDays.TWO_WEEKS,
      tracing: lambda.Tracing.ACTIVE,
      bundling: {
        externalModules: ['pg-native'], // pg-native is optional and causes issues
        nodeModules: ['pg', '@aws-sdk/client-secrets-manager'],
        minify: true,
        sourceMap: true,
        // Ensure monorepo packages are bundled correctly
        commandHooks: {
          beforeBundling(inputDir: string, outputDir: string): string[] {
            return [
              // Build types package before bundling
              `cd ${inputDir} && npm run build --workspace=@ctcm/types --if-present`,
            ]
          },
          afterBundling(_inputDir: string, _outputDir: string): string[] {
            return []
          },
          beforeInstall(_inputDir: string, _outputDir: string): string[] {
            return []
          },
        },
      },
    }

    // Customers Lambda Function
    const customersFunction = new nodejs.NodejsFunction(this, 'CustomersFunction', {
      ...commonLambdaProps,
      functionName: 'ctcm-dev-customers',
      entry: join(__dirname, '../../../apps/api/src/handlers/customers.ts'),
      handler: 'handler',
      description: 'CTCM Customers API handler',
    })

    // Grant permissions
    props.databaseSecret.grantRead(customersFunction)
    this.lambdaFunctions.push(customersFunction)

    // Shipments Lambda Function
    const shipmentsFunction = new nodejs.NodejsFunction(this, 'ShipmentsFunction', {
      ...commonLambdaProps,
      functionName: 'ctcm-dev-shipments',
      entry: join(__dirname, '../../../apps/api/src/handlers/shipments.ts'),
      handler: 'handler',
      description: 'CTCM Shipments API handler',
    })

    // Grant permissions
    props.databaseSecret.grantRead(shipmentsFunction)
    this.lambdaFunctions.push(shipmentsFunction)

    // API Resources and Methods

    // /customers resource
    const customersResource = this.api.root.addResource('customers')
    customersResource.addMethod('GET', new apigateway.LambdaIntegration(customersFunction), {
      authorizer,
      authorizationType: apigateway.AuthorizationType.COGNITO,
    })
    customersResource.addMethod('POST', new apigateway.LambdaIntegration(customersFunction), {
      authorizer,
      authorizationType: apigateway.AuthorizationType.COGNITO,
    })

    // /customers/{id} resource
    const customerIdResource = customersResource.addResource('{id}')
    customerIdResource.addMethod('GET', new apigateway.LambdaIntegration(customersFunction), {
      authorizer,
      authorizationType: apigateway.AuthorizationType.COGNITO,
    })
    customerIdResource.addMethod('PUT', new apigateway.LambdaIntegration(customersFunction), {
      authorizer,
      authorizationType: apigateway.AuthorizationType.COGNITO,
    })

    // /shipments resource
    const shipmentsResource = this.api.root.addResource('shipments')
    shipmentsResource.addMethod('GET', new apigateway.LambdaIntegration(shipmentsFunction), {
      authorizer,
      authorizationType: apigateway.AuthorizationType.COGNITO,
    })
    shipmentsResource.addMethod('POST', new apigateway.LambdaIntegration(shipmentsFunction), {
      authorizer,
      authorizationType: apigateway.AuthorizationType.COGNITO,
    })

    // /shipments/{id} resource
    const shipmentIdResource = shipmentsResource.addResource('{id}')
    shipmentIdResource.addMethod('GET', new apigateway.LambdaIntegration(shipmentsFunction), {
      authorizer,
      authorizationType: apigateway.AuthorizationType.COGNITO,
    })
    shipmentIdResource.addMethod('PUT', new apigateway.LambdaIntegration(shipmentsFunction), {
      authorizer,
      authorizationType: apigateway.AuthorizationType.COGNITO,
    })

    // Outputs
    new cdk.CfnOutput(this, 'ApiUrl', {
      value: this.apiUrl,
      description: 'API Gateway URL',
      exportName: 'CtcmDevApiUrl',
    })

    new cdk.CfnOutput(this, 'ApiId', {
      value: this.api.restApiId,
      description: 'API Gateway ID',
      exportName: 'CtcmDevApiId',
    })

    new cdk.CfnOutput(this, 'CustomersFunctionName', {
      value: customersFunction.functionName,
      description: 'Customers Lambda Function Name',
      exportName: 'CtcmDevCustomersFunctionName',
    })

    new cdk.CfnOutput(this, 'ShipmentsFunctionName', {
      value: shipmentsFunction.functionName,
      description: 'Shipments Lambda Function Name',
      exportName: 'CtcmDevShipmentsFunctionName',
    })
  }
}
