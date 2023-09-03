import { Constants } from "./util/constants";
import { App } from "aws-cdk-lib";
import { AwsCdkCli } from "@aws-cdk/cli-lib-alpha";
import {
  getAwsDefaultProfile,
  getAwsDefaultRegion,
  readFile,
  setSpinnerText,
  stopSpinner,
  validateExistDirectory,
  validateExistFile,
} from "./util/intex";
import { HostingStack } from "./cdk/HostingStack";
import { RequireApproval } from "aws-cdk-lib/cloud-assembly-schema";

export class Deploy {
  private readonly directoryPath: string = process.cwd();
  private configContent: any;
  private readonly actionToExecute: string = "deploy";
  /**
   *
   */
  constructor(action: string) {
    this.actionToExecute = action;
    setSpinnerText("Initializing process, it may take a few minutes...");
    this.validations();
  }

  private validations(): void {
    //Validate if exist the config file.
    if (
      !validateExistFile(`${this.directoryPath}/${Constants.NAME_CONFIG_FILE}`)
    ) {
      setSpinnerText(
        `The ${Constants.NAME_CONFIG_FILE} file doesn't exist, plese execute 'awstool init' command.`,
        "fail",
      );
      return;
    }

    this.configContent = JSON.parse(
      readFile(`${this.directoryPath}/${Constants.NAME_CONFIG_FILE}`),
    );

    //Validate if public directory exist
    if (
      !validateExistDirectory(
        `${this.directoryPath}/${this.configContent.publicDirectory}`,
      )
    ) {
      setSpinnerText(
        `The ${this.directoryPath}/${this.configContent.publicDirectory} directory doesn't exist.`,
        "fail",
      );
      return;
    }

    //Validate if rootFile exist
    if (
      !validateExistFile(
        `${this.directoryPath}/${this.configContent.publicDirectory}/${this.configContent.rootFile}`,
      )
    ) {
      setSpinnerText(
        `The ${Constants.NAME_CONFIG_FILE} file doesn't exist, plese execute 'awstool init' command.`,
        "fail",
      );
      return;
    }

    //All validations passed execute stack deploy
    this.executeStackCdk();
  }

  private async executeStackCdk() {
    const app = new App();
    if (this.configContent.deployType === "hosting") {
      new HostingStack(app, this.configContent.projectIdentifier, {
        rootFile: this.configContent.rootFile,
        pathStaticFiles: !this.configContent.publicDirectory.endsWith("/")
          ? `${this.configContent.publicDirectory}/`
          : this.configContent.publicDirectory,
        createCdn: this.configContent.createCdn,
        hostedZoneId: this.configContent.route53
          ? this.configContent.route53.hostedZoneId
          : null,
        hostedZoneName: this.configContent.route53
          ? this.configContent.route53.hostedZoneName
          : null,
        recordName: this.configContent.route53
          ? this.configContent.route53.recordName
          : null,
      });
      const cli = AwsCdkCli.fromCdkAppDirectory(app.synth().directory, {
        app: app.synth().directory,
      });

      if (this.actionToExecute === "deploy") {
        await cli.deploy({
          profile: getAwsDefaultProfile(),
          requireApproval: RequireApproval.NEVER,
        });

        if (this.configContent.route53) {
          console.log(
            `APP URL: https://${this.configContent.route53.recordName}\n`,
          );
        }

        stopSpinner("Your application was deployed success.");
      } else {
        await cli.destroy({
          profile: getAwsDefaultProfile(),
        });
        stopSpinner("Your application was destroyed success.");
      }
    }
  }
}
