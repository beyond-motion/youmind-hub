import { resolveSyncTarget } from "../packages/core/lib/config.mjs";
import { FeishuBitableApiClient, getTenantAccessToken } from "../packages/core/lib/feishu-api.mjs";
import { loadOrFetchPromptPayload } from "../packages/core/lib/prompt-source.mjs";
import { chunk, normalizePromptToRow } from "../packages/core/lib/prompt-utils.mjs";

async function listAllExistingRecords(client, baseToken, tableId) {
  const records = new Map();
  let pageToken = "";

  while (true) {
    const data = await client.listRecords({
      baseToken,
      tableId,
      pageToken
    });

    for (const record of data.items || []) {
      const fields = record.fields || {};
      const promptId = fields["Prompt ID"] ? String(fields["Prompt ID"]) : "";

      if (!promptId) {
        continue;
      }

      records.set(promptId, {
        recordId: record.record_id,
        contentHash: fields["Content Hash"] ? String(fields["Content Hash"]) : "",
        active: fields["Active"] === true || fields["Active"] === "true"
      });
    }

    if (!data.has_more || !data.page_token) {
      break;
    }

    pageToken = data.page_token;
  }

  return records;
}

async function batchCreate(client, baseToken, tableId, rows) {
  for (const group of chunk(rows, 100)) {
    await client.batchCreateRecords({
      baseToken,
      tableId,
      rows: group
    });
  }
}

async function batchUpdate(client, baseToken, tableId, updates) {
  for (const group of chunk(updates, 100)) {
    await client.batchUpdateRecords({
      baseToken,
      tableId,
      records: group.map((entry) => ({
        record_id: entry.recordId,
        fields: entry.fields
      }))
    });
  }
}

async function main() {
  const target = resolveSyncTarget();
  const syncedAt = new Date().toISOString();
  const token = await getTenantAccessToken();
  const client = new FeishuBitableApiClient(token);
  const { payload, source } = await loadOrFetchPromptPayload({
    locale: target.locale,
    model: target.model,
    forceRefresh: process.env.YOUMIND_FORCE_REFRESH === "1",
    onProgress({ page, totalPages, fetched, total }) {
      console.log(`  page ${page}/${totalPages} fetched=${fetched}/${total}`);
    }
  });

  console.log(
    source === "cache"
      ? `Using cached prompts snapshot (${payload.prompts.length} rows)`
      : source === "stale-cache"
        ? `Using stale cached prompts snapshot after fetch failure (${payload.prompts.length} rows)`
      : `Fetched fresh prompts snapshot (${payload.prompts.length} rows)`
  );

  console.log("Loading existing Feishu records ...");
  const existing = await listAllExistingRecords(client, target.baseToken, target.tableId);

  const desiredRows = payload.prompts.map((prompt) =>
    normalizePromptToRow(prompt, {
      locale: target.locale,
      model: target.model,
      syncedAt,
      active: true
    })
  );

  const desiredIds = new Set(desiredRows.map((row) => row["Prompt ID"]));
  const creates = [];
  const updates = [];
  const deactivations = [];

  for (const row of desiredRows) {
    const promptId = row["Prompt ID"];
    const current = existing.get(promptId);

    if (!current) {
      creates.push(row);
      continue;
    }

    if (current.contentHash !== row["Content Hash"] || current.active !== true) {
      updates.push({
        recordId: current.recordId,
        fields: row
      });
    }
  }

  for (const [promptId, current] of existing.entries()) {
    if (!desiredIds.has(promptId) && current.active) {
      deactivations.push({
        recordId: current.recordId,
        fields: {
          Active: false
        }
      });
    }
  }

  console.log(
    `Sync plan: create=${creates.length} update=${updates.length} deactivate=${deactivations.length}`
  );

  if (creates.length > 0) {
    await batchCreate(client, target.baseToken, target.tableId, creates);
  }

  if (updates.length > 0) {
    await batchUpdate(client, target.baseToken, target.tableId, updates);
  }

  if (deactivations.length > 0) {
    await batchUpdate(client, target.baseToken, target.tableId, deactivations);
  }

  console.log(
    `Finished. total=${payload.prompts.length} created=${creates.length} updated=${updates.length} inactive=${deactivations.length}`
  );
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
