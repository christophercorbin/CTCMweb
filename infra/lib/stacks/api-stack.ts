import * as cdk from 'aws-cdk-lib'
import * as ec2 from 'aws-cdk-lib/aws-ec2'
import * as cognito from 'aws-cdk-lib/aws-cognito'
import * as secretsmanager from 'aws-cdk-lib/aws-secretsmanager'
import * as s3 from 'aws-cdk-lib/aws-s3'
import * as apigateway from 'aws-cdk-lib/aws-apigateway'
import * as lambda from 'aws-cdk-lib/aws-lambda'
import { Construct } from 'constructs'

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

    // JWT Authorizer using Cognito (will be configured in Phase 3)
    // const authorizer = new apigateway.CognitoUserPoolsAuthorizer(this, 'Authorizer', {
    //   cognitoUserPools: [props.userPool],
    //   authorizerName: 'CognitoAuthorizer',
    //   identitySource: 'method.request.header.Authorization',
    // })

    // Placeholder for Lambda functions and API resources
    // These will be implemented in Phase 3

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
  }
}
