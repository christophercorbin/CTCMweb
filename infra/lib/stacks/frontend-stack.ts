import * as cdk from 'aws-cdk-lib'
import * as s3 from 'aws-cdk-lib/aws-s3'
import * as cloudfront from 'aws-cdk-lib/aws-cloudfront'
import * as iam from 'aws-cdk-lib/aws-iam'
import { Construct } from 'constructs'

export interface FrontendStackProps extends cdk.StackProps {
  apiUrl: string
  frontendBucket: s3.IBucket
}

export class FrontendStack extends cdk.Stack {
  public readonly bucket: s3.IBucket
  public readonly distribution: cloudfront.IDistribution
  public readonly originAccessIdentity: cloudfront.OriginAccessIdentity

  constructor(scope: Construct, id: string, props: FrontendStackProps) {
    super(scope, id, props)

    // Use the frontend bucket created in DataStack
    this.bucket = props.frontendBucket

    // Create Origin Access Identity for CloudFront to access S3
    this.originAccessIdentity = new cloudfront.OriginAccessIdentity(this, 'OAI', {
      comment: 'OAI for CTCM frontend bucket',
    })

    // Add bucket policy to allow CloudFront OAI to read from bucket
    // Note: We can't use grantRead() here as it would create a circular dependency
    // The bucket policy will be added manually or via a separate update

    // Use existing CloudFront distribution E34Q2E7TZIYZAB
    // Import the distribution by ID
    this.distribution = cloudfront.Distribution.fromDistributionAttributes(
      this,
      'Distribution',
      {
        distributionId: 'E34Q2E7TZIYZAB',
        domainName: 'd3example.cloudfront.net', // Placeholder, will be updated
      }
    )

    // Note: The existing CloudFront distribution needs to be manually configured with:
    // 1. Origin: S3 bucket with OAI
    // 2. Default root object: index.html
    // 3. Error pages: 404 -> /index.html (for SPA routing)
    // 4. Cache behaviors for static assets

    // Outputs
    new cdk.CfnOutput(this, 'FrontendBucketNameRef', {
      value: this.bucket.bucketName,
      description: 'Frontend S3 Bucket Name (reference)',
    })

    new cdk.CfnOutput(this, 'OriginAccessIdentityId', {
      value: this.originAccessIdentity.originAccessIdentityId,
      description: 'CloudFront Origin Access Identity ID',
    })

    new cdk.CfnOutput(this, 'DistributionId', {
      value: this.distribution.distributionId,
      description: 'CloudFront Distribution ID',
      exportName: 'CtcmDevDistributionId',
    })

    new cdk.CfnOutput(this, 'ApiUrl', {
      value: props.apiUrl,
      description: 'API Gateway URL for frontend configuration',
    })
  }
}
