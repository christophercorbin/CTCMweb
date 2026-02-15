import * as cdk from 'aws-cdk-lib'
import * as ec2 from 'aws-cdk-lib/aws-ec2'
import * as s3 from 'aws-cdk-lib/aws-s3'
import * as secretsmanager from 'aws-cdk-lib/aws-secretsmanager'
import { Construct } from 'constructs'

export interface OcrStackProps extends cdk.StackProps {
  vpc: ec2.IVpc
  lambdaSecurityGroup: ec2.SecurityGroup
  documentBucket: s3.Bucket
  databaseSecret: secretsmanager.ISecret
}

export class OcrStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props: OcrStackProps) {
    super(scope, id, props)

    // OCR pipeline components will be implemented in Phase 4
    // - S3 event notification
    // - Lambda trigger function
    // - Textract integration
    // - Step Functions state machine
    // - Lambda functions for parsing, validation, and storage

    // Outputs
    new cdk.CfnOutput(this, 'OcrStackReady', {
      value: 'OCR stack placeholder created',
      description: 'OCR stack status',
    })
  }
}
