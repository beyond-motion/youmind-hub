import { execFile, execFileSync } from "child_process";

const DEFAULT_RETRY_COUNT = 5;
const DEFAULT_RETRY_DELAY_MS = 1500;

function formatCommandError(error) {
  const stdout = error.stdout ? String(error.stdout) : "";
  const stderr = error.stderr ? String(error.stderr) : "";
  const detail = [stdout.trim(), stderr.trim()].filter(Boolean).join("\n");
  return detail || error.message;
}

function getRetryCount() {
  const value = Number.parseInt(process.env.LARK_CLI_RETRIES || "", 10);
  return Number.isFinite(value) && value >= 0 ? value : DEFAULT_RETRY_COUNT;
}

function getRetryDelayMs() {
  const value = Number.parseInt(process.env.LARK_CLI_RETRY_DELAY_MS || "", 10);
  return Number.isFinite(value) && value > 0 ? value : DEFAULT_RETRY_DELAY_MS;
}

function sleepSync(ms) {
  Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, ms);
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function shouldRetryLarkCliError(error) {
  const detail = formatCommandError(error).toLowerCase();

  return [
    '"code": 5000',
    "[5000]",
    "api_error",
    "too many requests",
    "rate limit",
    "timeout",
    "timed out",
    "econnreset",
    "etimedout",
    "socket hang up",
    "internal server error",
    "bad gateway",
    "service unavailable",
    "gateway timeout"
  ].some((pattern) => detail.includes(pattern));
}

function getRetryDelayForAttempt(attempt) {
  return getRetryDelayMs() * 2 ** Math.max(0, attempt - 1);
}

export function runLarkCli(args) {
  const retries = getRetryCount();
  let lastError;

  for (let attempt = 0; attempt <= retries; attempt += 1) {
    try {
      return execFileSync("lark-cli", args, {
        encoding: "utf8",
        env: { ...process.env, LARK_CLI_NO_PROXY: "1" },
        maxBuffer: 1024 * 1024 * 64
      }).trim();
    } catch (error) {
      lastError = error;

      if (attempt >= retries || !shouldRetryLarkCliError(error)) {
        break;
      }

      const delayMs = getRetryDelayForAttempt(attempt + 1);
      console.warn(
        `lark-cli ${args.join(" ")} failed with a retryable error. Retrying in ${delayMs}ms (${attempt + 1}/${retries}) ...`
      );
      sleepSync(delayMs);
    }
  }

  throw new Error(`lark-cli ${args.join(" ")} failed:\n${formatCommandError(lastError)}`);
}

export function runLarkCliJson(args) {
  const output = runLarkCli(args);
  return JSON.parse(output);
}

export async function runLarkCliAsync(args) {
  const runOnce = () =>
    new Promise((resolve, reject) => {
      execFile(
        "lark-cli",
        args,
        {
          encoding: "utf8",
          env: { ...process.env, LARK_CLI_NO_PROXY: "1" },
          maxBuffer: 1024 * 1024 * 64
        },
        (error, stdout, stderr) => {
          if (error) {
            reject({ ...error, stdout, stderr });
            return;
          }

          resolve(String(stdout || "").trim());
        }
      );
    });

  const retries = getRetryCount();
  let lastError;

  for (let attempt = 0; attempt <= retries; attempt += 1) {
    try {
      return await runOnce();
    } catch (error) {
      lastError = error;

      if (attempt >= retries || !shouldRetryLarkCliError(error)) {
        break;
      }

      const delayMs = getRetryDelayForAttempt(attempt + 1);
      console.warn(
        `lark-cli ${args.join(" ")} failed with a retryable error. Retrying in ${delayMs}ms (${attempt + 1}/${retries}) ...`
      );
      await sleep(delayMs);
    }
  }

  throw new Error(`lark-cli ${args.join(" ")} failed:\n${formatCommandError(lastError)}`);
}

export async function runLarkCliJsonAsync(args) {
  const output = await runLarkCliAsync(args);
  return JSON.parse(output);
}
