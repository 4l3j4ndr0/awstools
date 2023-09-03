import os from "os";
import ora from "ora";
import fs from "fs";
import sudo from "sudo-prompt";
var spinner = ora();
import { exec, execSync } from "child_process";
import path from "path";

export function setProfileDefault(value: string) {
  const tempDir = os.tmpdir();
  const tempFilePath = path.join(tempDir, "AWSDefaultProfile");
  fs.writeFileSync(tempFilePath, `${value}`);
}

export function getAwsDefaultProfile(): string {
  const tempDir = os.tmpdir();
  const tempFilePath = path.join(tempDir, "AWSDefaultProfile");
  const profile = fs.readFileSync(tempFilePath, "utf8");
  return profile;
}

export function getAwsDefaultRegion(): string {
  return execSync(
    `aws configure get region --profile ${getAwsDefaultProfile()}`,
  ).toString();
}

export function showSpinner(message: string) {
  spinner.start(message);
}

export function setSpinnerText(message: string, type: string = "info") {
  setSpinnerType(type, message);
}

export function stopSpinner(message: string, type: string = "success") {
  setSpinnerType(type, message);
  spinner.stop();
}

export function writeFile(filePath: string, content: string) {
  return fs.writeFileSync(filePath, content);
}

export function validateExistFile(path: string): boolean {
  try {
    const exist = fs.existsSync(path.replace("//", "/"));
    return exist;
  } catch (error) {
    return false;
  }
}

export function validateExistDirectory(path: string): boolean {
  try {
    const stat = fs.statSync(path.replace("//", "/"));
    return stat.isDirectory();
  } catch (error) {
    return false;
  }
}

export function readFile(path: string): string {
  try {
    const data = fs.readFileSync(path.replace("//", "/"), "utf8");
    return data;
  } catch (error) {
    return "";
  }
}

export function makeDirectory(path: string): boolean {
  try {
    fs.mkdirSync(path);
    return true;
  } catch (error) {
    return false;
  }
}

function setSpinnerType(type: string, message: string) {
  switch (type) {
    case "success":
      spinner.succeed(message);
      break;
    case "info":
      spinner.info(message);
      break;
    case "warn":
      spinner.warn(message);
      break;
    case "fail":
      spinner.fail(message);
      break;
  }
}
