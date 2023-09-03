#! /usr/bin/env node
import { Command } from "commander";
import figlet from "figlet";
import { AWSProfileCreator } from "./src/modules/AwsProfile";
import { execSync } from "child_process";
import { getAwsDefaultProfile } from "./src/util/intex";
import { AWSHosting } from "./src/modules/AwsHosting";
import { Choices } from "./src/interfaces";
import { select } from "@inquirer/prompts";
import { AWSEcs } from "./src/modules/AwsEcs";
import { Deploy } from "./src/Deploy";

const program = new Command();

program
  .version("1.0.0")
  .description(
    `${figlet.textSync(
      "AWS Tools",
    )}\nAws Tool is a easy CLI that help you to manage the AWS profiles and deploy easily ECS applications and frontend apps inside S3 with Cloudfront.`,
  );

program
  .command("profiles")
  .description(
    "List available AWS profiles, and you will be able to select It as a default.",
  )
  .action(() => {
    new AWSProfileCreator();
  });

program
  .command("init")
  .description(
    "Its command allows you to init the AWS Tool in your repository in two modes, hosting or ecs-app.",
  )
  .action(() => {
    const choices: Choices[] = [
      {
        name: "Hosting: Simplify the deployment of your static web application to AWS S3 and CloudFront with an easy initialization process.",
        value: "hosting",
        description: "",
      },
      {
        name: "Ecs-app: Accelerate the deployment of your containerized applications with ease using AWS ECS.",
        value: "ecs-app",
      },
    ];

    select({
      message: "Select type of config:",
      choices,
    }).then((typeConfig: string) => {
      switch (typeConfig) {
        case "hosting":
          new AWSHosting();
          break;
        case "ecs-app":
          new AWSEcs();
          break;
        default:
          break;
      }
    });
  });

program
  .command("deploy")
  .description(
    "Its command will deploy your app bassed on your awsconfig.json file.",
  )
  .action(() => {
    new Deploy("deploy");
  });

program
  .command("destroy")
  .description("Its command will destroy your app from AWS hosting.")
  .action(() => {
    new Deploy("destroy");
  });

program.arguments("<command...>").action((command) => {
  const awsCommand = command.join(" ");

  try {
    const profile = getAwsDefaultProfile();
    const output = execSync(`aws ${awsCommand} --profile ${profile}`, {
      stdio: "pipe",
    }).toString();
    console.log(output);
  } catch (error) {
    console.error(`Error executing AWS CLI command: ${error}`);
  }
});

program.parse(process.argv);
