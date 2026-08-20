import { access } from "node:fs/promises";
import chromium from "@sparticuz/chromium";

const WINDOWS_BROWSERS = [
  "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
  "C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe",
  "C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe",
  "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe",
];

export async function browserLaunchOptions(options = {}) {
  return {
    args: process.platform === "win32" ? ["--disable-dev-shm-usage", "--no-sandbox"] : chromium.args,
    executablePath: await browserExecutablePath(),
    headless: true,
    ...options,
  };
}

async function browserExecutablePath() {
  const configured = process.env.PUPPETEER_EXECUTABLE_PATH;
  if (configured && await exists(configured)) return configured;
  if (process.platform === "win32") {
    for (const candidate of WINDOWS_BROWSERS) if (await exists(candidate)) return candidate;
    throw new Error("No local Chrome or Edge executable found for Chromium E2E");
  }
  return chromium.executablePath();
}

async function exists(path) {
  try {
    await access(path);
    return true;
  } catch {
    return false;
  }
}
