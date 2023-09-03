import * as cdk from "aws-cdk-lib";
import { Stack } from "aws-cdk-lib";
import {
  BlockPublicAccess,
  Bucket,
  BucketAccessControl,
} from "aws-cdk-lib/aws-s3";
import {
  CloudFrontWebDistribution,
  PriceClass,
  OriginAccessIdentity,
  ViewerCertificate,
} from "aws-cdk-lib/aws-cloudfront";
import { CfnOutput } from "aws-cdk-lib";
import { Construct } from "constructs";
import { HostingProps } from "../interfaces";
import * as s3deploy from "aws-cdk-lib/aws-s3-deployment";
import {
  ARecord,
  HostedZone,
  IHostedZone,
  RecordTarget,
} from "aws-cdk-lib/aws-route53";
import { CertificateValidation } from "aws-cdk-lib/aws-certificatemanager";

export class HostingStack extends Stack {
  private distribution?: CloudFrontWebDistribution;
  private readonly hostedZone?: IHostedZone;
  private readonly hostedZoneArr: string[] = [];
  private certificate?: cdk.aws_certificatemanager.Certificate;
  private bucket?: Bucket;

  constructor(scope: Construct, id: string, props?: HostingProps) {
    super(scope, id);

    if (props?.hostedZoneId && props.hostedZoneName) {
      this.hostedZoneArr = props.hostedZoneId.split("/");
      this.hostedZone = HostedZone.fromHostedZoneAttributes(
        this,
        "HostedZone",
        {
          hostedZoneId: this.hostedZoneArr[2],
          zoneName: props.hostedZoneName,
        },
      );
    }

    if (props?.createCdn) {
      this.bucket = new Bucket(this, "BucketPrivate", {
        versioned: true, // Enable versioning for the bucket
        removalPolicy: cdk.RemovalPolicy.DESTROY, // Delete the bucket when the stack is destroyed (for demonstration purposes only)
        autoDeleteObjects: true,
        bucketName: props?.recordName ? props.recordName : undefined,
      });
    } else {
      this.bucket = new Bucket(this, "BucketPublic", {
        versioned: true, // Enable versioning for the bucket
        removalPolicy: cdk.RemovalPolicy.DESTROY, // Delete the bucket when the stack is destroyed (for demonstration purposes only)
        autoDeleteObjects: true,
        websiteErrorDocument: props?.rootFile,
        websiteIndexDocument: props?.rootFile,
        publicReadAccess: !props?.createCdn,
        blockPublicAccess: BlockPublicAccess.BLOCK_ACLS,
        accessControl: BucketAccessControl.BUCKET_OWNER_FULL_CONTROL,
      });
    }

    if (props?.pathStaticFiles) {
      new s3deploy.BucketDeployment(this, "UploadFiles", {
        sources: [s3deploy.Source.asset(props.pathStaticFiles)],
        destinationBucket: this.bucket,
      });
    }

    if (props?.createCdn) {
      const oai = new OriginAccessIdentity(this, "OriginAccessIdentity");

      this.bucket.grantRead(oai.grantPrincipal);

      if (props.hostedZoneName && props.recordName && this.hostedZone) {
        this.certificate = new cdk.aws_certificatemanager.Certificate(
          this,
          "Acm",
          {
            domainName: props.recordName,
            validation: CertificateValidation.fromDns(this.hostedZone),
          },
        );
      }

      // Create a CloudFront distribution
      this.distribution = new CloudFrontWebDistribution(this, "Distribution", {
        originConfigs: [
          {
            s3OriginSource: {
              s3BucketSource: this.bucket,
              originAccessIdentity: oai, // Create an Origin Access Identity and grant access to the bucket
            },
            behaviors: [{ isDefaultBehavior: true }],
          },
        ], // Enable CloudFront access logs// Set the security policy to TLS 1.2
        priceClass: PriceClass.PRICE_CLASS_ALL, // Use all edge locations
        defaultRootObject: props?.rootFile,
        viewerCertificate: !this.certificate
          ? undefined
          : ViewerCertificate.fromAcmCertificate(this.certificate, {
              aliases: [props.recordName ? props.recordName : ""],
            }),
      });

      // Output the CloudFront distribution DNS name
      new CfnOutput(this, "DistributionDNS", {
        value: this.distribution.distributionDomainName,
        description: "The HOST NAME to access to your application.",
      });
    } else {
      new cdk.CfnOutput(this, "WebAppURL", {
        value: this.bucket.bucketWebsiteUrl,
      });
    }

    if (this.hostedZone && props?.recordName && props?.hostedZoneName) {
      new ARecord(this, "Route53Record", {
        zone: this.hostedZone,
        recordName: props.recordName,
        target: this.distribution
          ? RecordTarget.fromAlias(
              new cdk.aws_route53_targets.CloudFrontTarget(this.distribution),
            )
          : RecordTarget.fromAlias(
              new cdk.aws_route53_targets.BucketWebsiteTarget(this.bucket),
            ),
      });
      new cdk.CfnOutput(this, "AppURL", {
        value: `${props.createCdn ? `https://` : "http;//" + props.recordName}`,
      });
    }
  }
}
