import { execFile, execFileSync } from "child_process";

function getWranglerInvocation(args) {
  const executable = process.env.WRANGLER_EXECUTABLE || "npx";

  if (executable === "wrangler") {
    return {
      executable,
      args
    };
  }

  return {
    executable,
    args: ["--yes", "wrangler", ...args]
  };
}

function formatCommandError(error) {
  const stdout = error.stdout ? String(error.stdout) : "";
  const stderr = error.stderr ? String(error.stderr) : "";
  const detail = [stdout.trim(), stderr.trim()].filter(Boolean).join("\n");
  return detail || error.message;
}

export function runWranglerSync(args) {
  const invocation = getWranglerInvocation(args);

  try {
    return execFileSync(invocation.executable, invocation.args, {
      encoding: "utf8",
      env: process.env,
      maxBuffer: 1024 * 1024 * 64
    }).trim();
  } catch (error) {
    throw new Error(`wrangler ${args.join(" ")} failed:\n${formatCommandError(error)}`);
  }
}

export function runWrangler(args) {
  const invocation = getWranglerInvocation(args);

  return new Promise((resolve, reject) => {
    execFile(
      invocation.executable,
      invocation.args,
      {
        encoding: "utf8",
        env: process.env,
        maxBuffer: 1024 * 1024 * 64
      },
      (error, stdout, stderr) => {
        if (error) {
          reject(new Error(`wrangler ${args.join(" ")} failed:\n${formatCommandError({ ...error, stdout, stderr })}`));
          return;
        }

        resolve(String(stdout || "").trim());
      }
    );
  });
}

export function ensureWranglerAuthenticated() {
  try {
    return runWranglerSync(["whoami"]);
  } catch (error) {
    throw new Error(
      `${error.message}\nRun 'npx wrangler login' once on this machine, or set CLOUDFLARE_API_TOKEN before running sync:r2.`
    );
  }
}

function extractFirstUrl(text) {
  const match = String(text || "").match(/https?:\/\/\S+/);
  return match ? match[0].trim().replace(/['".,;:!?]+$/, "") : "";
}

export function getR2DevUrl(bucketName) {
  const output = runWranglerSync(["r2", "bucket", "dev-url", "get", bucketName]);
  const url = extractFirstUrl(output);

  if (!url) {
    throw new Error(`Unable to parse R2 dev URL from wrangler output:\n${output}`);
  }

  return url.replace(/\/+$/, "");
}

export function createR2Bucket(bucketName, location = "apac") {
  return runWranglerSync(["r2", "bucket", "create", bucketName, "--location", location]);
}

export function enableR2DevUrl(bucketName) {
  return runWranglerSync(["r2", "bucket", "dev-url", "enable", bucketName]);
}

export function disableR2DevUrl(bucketName) {
  return runWranglerSync(["r2", "bucket", "dev-url", "disable", bucketName]);
}

export function uploadFileToR2({
  bucketName,
  objectKey,
  filePath,
  contentType = "video/mp4",
  cacheControl = "public, max-age=31536000, immutable"
}) {
  return runWrangler([
    "r2",
    "object",
    "put",
    `${bucketName}/${objectKey}`,
    "--remote",
    "--file",
    filePath,
    "--content-type",
    contentType,
    "--cache-control",
    cacheControl
  ]);
}
