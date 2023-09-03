import fs from "fs";
import { select } from "@inquirer/prompts";
import { input } from "@inquirer/prompts";
import { execSync } from "child_process";
import { Choices } from "../interfaces";
import { setProfileDefault, showSpinner, stopSpinner } from "../util/intex";

export class AWSProfileCreator {
  private profileType: string = "";
  private profile: string = "";
  /**
   *
   */
  constructor() {
    try {
      const awsCliOutput: string = execSync(
        "aws configure list-profiles",
      ).toString();

      let profiles: string[] = awsCliOutput.trim().split("\n");
      profiles.push("Create new AWS credentials profile.");
      const choices: Choices[] = profiles.map((value: string) => ({
        name: value,
        value: value,
      }));

      select({
        message: "Select the AWS profile to use:",
        choices,
      }).then((profile: string) => {
        if (profile === "Create new AWS credentials profile.") {
          this.createNewProfileFlow();
          return;
        }
        showSpinner("Setting up profile");
        this.profile = profile;
        this.checkProfileType();
        stopSpinner("Profile configured success.");
      });
    } catch (error) {
      return;
    }
  }

  private createNewProfileFlow() {
    select({
      message: "Select the type of AWS profile to create:",
      choices: [
        { name: "SSO", value: "SSO" },
        { name: "IAM", value: "IAM" },
      ],
    }).then((type: string) => {
      if (type === "SSO") {
        try {
          execSync("aws configure sso", { stdio: "inherit" });
        } catch (error) {
          return;
        }
      } else {
        input({
          message: "Write the name to identify your new profile:",
          default: "default",
        }).then((profileName: string) => {
          try {
            execSync(`aws configure --profile ${profileName}`, {
              stdio: "inherit",
            });
          } catch (error) {
            return;
          }
        });
      }
    });
  }

  private checkProfileType(): void {
    try {
      if (this.profile === "default") {
        this.profileType = "IAM";
        this.setProfileToUse();
        return;
      }
      const files = [
        `${process.env.HOME || process.env.USERPROFILE}/.aws/config`,
        `${process.env.HOME || process.env.USERPROFILE}/.aws/credentials`,
      ];

      for (const filePath of files) {
        const fileContents = fs.readFileSync(filePath, "utf-8");
        const profileSectionRegex = /^\[profile\s(.+?)\]$/gm;
        let match: RegExpExecArray | null;
        while ((match = profileSectionRegex.exec(fileContents)) !== null) {
          const currentProfileName = match[1];

          if (currentProfileName === this.profile) {
            const profileConfigStartIndex = match.index + match[0].length;
            const profileConfigEndIndex = fileContents.indexOf(
              "[",
              profileConfigStartIndex,
            );

            const profileConfig = fileContents.substring(
              profileConfigStartIndex,
              profileConfigEndIndex,
            );
            const isSSOProfile = profileConfig.includes("sso_start_url");
            const isIAMProfile = profileConfig.includes("aws_access_key_id");

            if (isSSOProfile) {
              this.profileType = "SSO";
              this.setProfileToUse();
            } else if (isIAMProfile) {
              this.profileType = "IAM";
              this.setProfileToUse();
            }
          }
        }
      }
    } catch (error) {
      console.error(
        "An error occurred while checking the profile type:",
        error,
      );
    }
  }

  private setProfileToUse(): void {
    setProfileDefault(this.profile);
    if (this.profileType === "SSO") {
      execSync(`aws sso login --profile ${this.profile}`, {
        stdio: "inherit",
      });
    }
  }
}
