import * as cdk from 'aws-cdk-lib'
import * as ec2 from 'aws-cdk-lib/aws-ec2'
import * as rds from 'aws-cdk-lib/aws-rds'
import * as s3 from 'aws-cdk-lib/aws-s3'
import * as secretsmanager from 'aws-cdk-lib/aws-secretsmanager'
import * as lambda from 'aws-cdk-lib/aws-lambda'
import * as nodejs from 'aws-cdk-lib/aws-lambda-nodejs'
import { Construct } from 'constructs'

export interface DataStackProps extends cdk.StackProps {
  vpc: ec2.IVpc
  lambdaSecurityGroup: ec2.SecurityGroup
  databaseSecurityGroup: ec2.SecurityGroup
}

export class DataStack extends cdk.Stack {
  public readonly database: rds.DatabaseInstance
  public readonly databaseSecret: secretsmanager.ISecret
  public readonly documentBucket: s3.Bucket
  public readonly initDbFunction: lambda.Function

  constructor(scope: Construct, id: string, props: DataStackProps) {
    super(scope, id, props)

    // Database credentials secret
    this.databaseSecret = new secretsmanager.Secret(this, 'DatabaseSecret', {
      secretName: 'ctcm-dev-database-credentials',
      description: 'RDS PostgreSQL database credentials',
      generateSecretString: {
        secretStringTemplate: JSON.stringify({ username: 'ctcmadmin' }),
        generateStringKey: 'password',
        excludePunctuation: true,
        includeSpace: false,
        passwordLength: 32,
      },
    })

    // RDS PostgreSQL Instance (t4g.micro for cost efficiency)
    this.database = new rds.DatabaseInstance(this, 'Database', {
      engine: rds.DatabaseInstanceEngine.postgres({
        version: rds.PostgresEngineVersion.VER_16_6,
      }),
      instanceType: ec2.InstanceType.of(ec2.InstanceClass.T4G, ec2.InstanceSize.MICRO),
      vpc: props.vpc,
      vpcSubnets: {
        subnetType: ec2.SubnetType.PUBLIC, // Default VPC only has public subnets
      },
      securityGroups: [props.databaseSecurityGroup],
      databaseName: 'ctcm',
      credentials: rds.Credentials.fromSecret(this.databaseSecret),
      allocatedStorage: 20,
      maxAllocatedStorage: 100,
      storageEncrypted: true,
      backupRetention: cdk.Duration.days(7),
      deleteAutomatedBackups: true,
      removalPolicy: cdk.RemovalPolicy.SNAPSHOT,
      deletionProtection: false, // Set to true for production
      publiclyAccessible: true, // Temporarily true for dev - allows direct connection and Lambda access
      multiAz: false, // Set to true for production
    })

    // S3 Bucket for documents
    this.documentBucket = new s3.Bucket(this, 'DocumentBucket', {
      bucketName: `ctcm-dev-documents-${cdk.Aws.ACCOUNT_ID}`,
      encryption: s3.BucketEncryption.S3_MANAGED,
      versioned: true,
      blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL,
      removalPolicy: cdk.RemovalPolicy.RETAIN,
      lifecycleRules: [
        {
          id: 'MoveToGlacierAfter90Days',
          enabled: true,
          transitions: [
            {
              storageClass: s3.StorageClass.GLACIER,
              transitionAfter: cdk.Duration.days(90),
            },
          ],
        },
      ],
    })

    // Outputs
    new cdk.CfnOutput(this, 'DatabaseEndpoint', {
      value: this.database.dbInstanceEndpointAddress,
      description: 'RDS Database Endpoint',
      exportName: 'CtcmDevDatabaseEndpoint',
    })

    new cdk.CfnOutput(this, 'DatabaseSecretArn', {
      value: this.databaseSecret.secretArn,
      description: 'Database Credentials Secret ARN',
      exportName: 'CtcmDevDatabaseSecretArn',
    })

    new cdk.CfnOutput(this, 'DocumentBucketName', {
      value: this.documentBucket.bucketName,
      description: 'Document Storage Bucket Name',
      exportName: 'CtcmDevDocumentBucketName',
    })

    // Lambda function to initialize database schema
    // Note: Not in VPC since database is publicly accessible for dev
    this.initDbFunction = new nodejs.NodejsFunction(this, 'InitDbFunction', {
      functionName: 'ctcm-dev-init-db-schema',
      entry: 'lambda/init-db-schema.ts',
      handler: 'handler',
      runtime: lambda.Runtime.NODEJS_18_X,
      timeout: cdk.Duration.minutes(5),
      memorySize: 512,
      environment: {
        DATABASE_SECRET_ARN: this.databaseSecret.secretArn,
        DATABASE_HOST: this.database.dbInstanceEndpointAddress,
        DATABASE_NAME: 'ctcm',
      },
      bundling: {
        externalModules: ['pg-native'], // pg-native is optional and causes issues
        nodeModules: ['pg'],
      },
    })

    // Grant permissions
    this.databaseSecret.grantRead(this.initDbFunction)
    // Database is publicly accessible, so Lambda doesn't need VPC connection

    new cdk.CfnOutput(this, 'InitDbFunctionName', {
      value: this.initDbFunction.functionName,
      description: 'Database initialization Lambda function name',
      exportName: 'CtcmDevInitDbFunctionName',
    })
  }
}
