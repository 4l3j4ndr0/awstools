import { StackProps } from "aws-cdk-lib";

export interface Choices {
  name: string;
  value: string;
  description?: string;
  disabled?: boolean;
}

export interface HostingProps {
  rootFile: string;
  pathStaticFiles: string;
  createCdn: boolean;
  hostedZoneId?: string;
  hostedZoneName?: string;
  recordName?: string;
}

export interface HostedZone {
  id: string;
  name: string;
}
