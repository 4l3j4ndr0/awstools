import { select } from "@inquirer/prompts";
import { input } from "@inquirer/prompts";
import {
  getAwsDefaultProfile,
  makeDirectory,
  readFile,
  setSpinnerText,
  stopSpinner,
  validateExistDirectory,
  validateExistFile,
  writeFile,
} from "../util/intex";
import { Constants } from "../util/constants";
import path from "path";
import { execSync } from "child_process";
import { Choices, HostedZone } from "../interfaces";
export class AWSHosting {
  private readonly directoryPath: string = process.cwd();
  private readonly hostedZones?: HostedZone[] = [];
  private projectIdentifier: string = path.basename(this.directoryPath);
  private publicDirectory: string = "public";
  private rootFile: string = "index.html";
  private overWriteEntryFile: boolean = true;
  private createCdn: boolean = true;
  private hostedZoneId?: string;
  private recordName?: string;
  /**
   *
   */
  constructor() {
    if (
      validateExistFile(`${this.directoryPath}/${Constants.NAME_CONFIG_FILE}`)
    ) {
      try {
        const content: any = JSON.parse(
          readFile(`${this.directoryPath}/${Constants.NAME_CONFIG_FILE}`),
        );

        this.projectIdentifier = content.projectIdentifier;
        this.publicDirectory = content.publicDirectory;
        this.rootFile = content.rootFile;
        this.createCdn = content.createCdn;
        if (content.route53) {
          this.hostedZoneId = content.route53.hostedZoneId;
          this.recordName = content.route53.recordName;
        }
      } catch (e) {}
    }
    try {
      const awsCliOutput: any = JSON.parse(
        execSync(
          `aws route53 list-hosted-zones --profile ${getAwsDefaultProfile()}`,
        ).toString(),
      );
      for (const item of awsCliOutput.HostedZones) {
        this.hostedZones?.push({
          name: item.Name,
          id: item.Id,
        });
      }
    } catch (error) {}

    this.initFlow();
  }

  private async initFlow() {
    console.log(`Actually using profile (${getAwsDefaultProfile()})\n`);

    setSpinnerText(`Setting up public directory:`);
    console.log(
      `\nThe "public" directory is where you should place your hosting assets. This directory, relative to your project, will be uploaded to AWS when you run the "awstool deploy" command. If you have a build process for your assets, you should use the output directory of your build process as the "public" directory.\n`,
    );

    this.projectIdentifier = await input({
      message: "Assign a name to identify the AWS hosting project?",
      default: this.projectIdentifier,
    });

    this.publicDirectory = await input({
      message: "What do you want to use as your public directory?",
      default: this.publicDirectory,
    });

    if (
      !validateExistDirectory(`${this.directoryPath}/${this.publicDirectory}`)
    ) {
      setSpinnerText(`Creating ${this.publicDirectory} directory.`);
      makeDirectory(`${this.directoryPath}/${this.publicDirectory}`);
    }

    this.rootFile = await input({
      message: "What is your entry file?",
      default: this.rootFile,
    });

    if (
      validateExistFile(
        `${this.directoryPath}/${this.publicDirectory}/${this.rootFile}`,
      )
    ) {
      this.overWriteEntryFile = await select({
        message: `Actually exist an ${this.publicDirectory}/${this.rootFile} file, do you want to overwrite It?`,
        choices: [
          {
            name: "NO",
            value: false,
          },
          {
            name: "Yes",
            value: true,
          },
        ],
      });
    }

    this.createCdn = await select({
      message: `Want to enable CDN to bring content closer to your audience?`,
      choices: [
        {
          name: "NO",
          value: false,
        },
        {
          name: "Yes",
          value: true,
        },
      ],
    });

    if (this.createCdn) {
      let choices: Choices[] = [
        {
          name: "Continue without assigning a DNS record.",
          value: "null",
        },
      ];
      if (this.hostedZones) {
        for (const i of this.hostedZones) {
          choices.push({
            name: i.name,
            value: i.id,
          });
        }
      }
      this.hostedZoneId = await select({
        message: `You have a public hosted zones configured, you want to create a DNS record to associate with your application?`,
        choices,
      });

      if (this.hostedZoneId !== "null" && this.hostedZones) {
        this.recordName = await input({
          message: "What do you want to name the DNS record?",
          default: `${this.projectIdentifier}.${
            this.hostedZones.find((i) => i.id === this.hostedZoneId)?.name
          }`,
        });
      }
    }

    this.createHostingProject();
  }

  private createHostingProject() {
    if (!this.overWriteEntryFile) {
      setSpinnerText(
        `Skipping write of ${this.publicDirectory}/${this.rootFile}.`,
      );
    } else {
      writeFile(
        `${this.directoryPath}/${this.publicDirectory}/${this.rootFile}`,
        Constants.INDEX_HTML,
      );
      setSpinnerText(`Writing file ${this.publicDirectory}/${this.rootFile}.`);
    }
    if (
      !validateExistFile(
        `${this.directoryPath}/${this.publicDirectory}/404.html`,
      )
    ) {
      setSpinnerText(`Writing file ${this.publicDirectory}/404.html.`);
      writeFile(
        `${this.directoryPath}/${this.publicDirectory}/404.html`,
        Constants.ERROR_HTML,
      );
    } else {
      setSpinnerText(`Skipping write of ${this.publicDirectory}/404.html.`);
    }

    setSpinnerText(`Creating config file ${Constants.NAME_CONFIG_FILE}...`);

    writeFile(
      `${this.directoryPath}/${Constants.NAME_CONFIG_FILE}`,
      Constants.AWS_CONFIG_HOSTING(
        this.projectIdentifier,
        this.publicDirectory,
        this.rootFile,
        this.createCdn,
        this.hostedZoneId,
        this.hostedZones?.find((i) => i.id === this.hostedZoneId)?.name,
        this.recordName ? this.recordName.replace(/\.$/, "") : undefined,
      ),
    );

    stopSpinner("Aws hosting configured success.");
  }
}
