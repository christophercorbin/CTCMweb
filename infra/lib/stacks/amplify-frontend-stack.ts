import * as cdk from 'aws-cdk-lib'
import * as amplify from 'aws-cdk-lib/aws-amplify'
import * as iam from 'aws-cdk-lib/aws-iam'
import * as codebuild from 'aws-cdk-lib/aws-codebuild'
import { Construct } from 'constructs'

export interface AmplifyFrontendStackProps extends cdk.StackProps {
  apiUrl: string
  cognitoUserPoolId: string
  cognitoClientId: string
  githubRepo: string // Format: owner/repo
  githubBranch?: string
}

export class AmplifyFrontendStack extends cdk.Stack {
  public readonly app: amplify.CfnApp
  public readonly branch: amplify.CfnBranch

  constructor(scope: Construct, id: string, props: AmplifyFrontendStackProps) {
    super(scope, id, props)

    const branch = props.githubBranch || 'main'

    // Create Amplify App
    this.app = new amplify.CfnApp(this, 'AmplifyApp', {
      name: 'ctcm-web',
      description: 'CTCM Freight Forwarding System',
      platform: 'WEB', // Static hosting for SPA
      
      // Note: Repository will be connected via AWS Console after stack creation
      // This avoids needing to provide GitHub OAuth token in CDK
      
      // Build settings for monorepo
      buildSpec: cdk.Fn.sub(`version: 1
frontend:
  phases:
    preBuild:
      commands:
        - npm ci
        - cd apps/web
        - npm ci
    build:
      commands:
        - npm run build
  artifacts:
    baseDirectory: apps/web/dist
    files:
      - '**/*'
  cache:
    paths:
      - node_modules/**/*
      - apps/web/node_modules/**/*`),

      // Environment variables for the build
      environmentVariables: [
        {
          name: 'VITE_API_URL',
          value: props.apiUrl,
        },
        {
          name: 'VITE_COGNITO_USER_POOL_ID',
          value: props.cognitoUserPoolId,
        },
        {
          name: 'VITE_COGNITO_CLIENT_ID',
          value: props.cognitoClientId,
        },
        {
          name: 'VITE_AWS_REGION',
          value: this.region,
        },
      ],

      // Custom rules for SPA routing
      customRules: [
        {
          source: '</^[^.]+$|\\.(?!(css|gif|ico|jpg|js|png|txt|svg|woff|woff2|ttf|map|json)$)([^.]+$)/>',
          target: '/index.html',
          status: '200',
        },
      ],

      // IAM service role for Amplify
      iamServiceRole: new iam.Role(this, 'AmplifyRole', {
        assumedBy: new iam.ServicePrincipal('amplify.amazonaws.com'),
        description: 'Service role for Amplify Hosting',
        managedPolicies: [
          iam.ManagedPolicy.fromAwsManagedPolicyName('AdministratorAccess-Amplify'),
        ],
      }).roleArn,
    })

    // Note: Branch will be created after connecting GitHub repository via Console

    // Outputs
    new cdk.CfnOutput(this, 'AmplifyAppId', {
      value: this.app.attrAppId,
      description: 'Amplify App ID',
      exportName: 'CtcmDevAmplifyAppId',
    })

    new cdk.CfnOutput(this, 'AmplifyConsoleUrl', {
      value: `https://console.aws.amazon.com/amplify/home?region=${this.region}#/${this.app.attrAppId}`,
      description: 'Amplify Console URL',
    })

    new cdk.CfnOutput(this, 'SetupInstructions', {
      value: 'Connect GitHub: Amplify Console > App Settings > General > Connect repository > Select christophercorbin/CTCMweb > Branch: main',
      description: 'Instructions to connect GitHub repository',
    })
  }
}
