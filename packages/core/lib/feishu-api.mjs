import { resolveFeishuAppCredentials } from "./config.mjs";

const FEISHU_ORIGIN = "https://open.feishu.cn";

function buildQuery(params = {}) {
  const searchParams = new URLSearchParams();

  for (const [key, value] of Object.entries(params)) {
    if (Array.isArray(value)) {
      for (const item of value) {
        searchParams.append(key, item);
      }
      continue;
    }

    if (value !== undefined && value !== null && value !== "") {
      searchParams.set(key, String(value));
    }
  }

  const queryString = searchParams.toString();
  return queryString ? `?${queryString}` : "";
}

export async function getTenantAccessToken() {
  const { appId, appSecret } = resolveFeishuAppCredentials();

  const response = await fetch(`${FEISHU_ORIGIN}/open-apis/auth/v3/tenant_access_token/internal`, {
    method: "POST",
    headers: {
      "content-type": "application/json"
    },
    body: JSON.stringify({
      app_id: appId,
      app_secret: appSecret
    })
  });

  if (!response.ok) {
    throw new Error(`Feishu auth failed: ${response.status} ${response.statusText}`);
  }

  const payload = await response.json();

  if (payload.code !== 0 || !payload.tenant_access_token) {
    throw new Error(`Feishu auth error: ${payload.msg || "unknown error"}`);
  }

  return payload.tenant_access_token;
}

export class FeishuBitableApiClient {
  constructor(token) {
    this.token = token;
  }

  async request(method, path, { query, body } = {}) {
    const url = `${FEISHU_ORIGIN}${path}${buildQuery(query)}`;
    const response = await fetch(url, {
      method,
      headers: {
        authorization: `Bearer ${this.token}`,
        "content-type": "application/json"
      },
      body: body ? JSON.stringify(body) : undefined
    });

    if (!response.ok) {
      throw new Error(`Feishu request failed: ${response.status} ${response.statusText} ${url}`);
    }

    const payload = await response.json();

    if (payload.code !== 0) {
      throw new Error(`Feishu API error (${path}): ${payload.msg || "unknown error"}`);
    }

    return payload.data;
  }

  listRecords({ baseToken, tableId, pageToken = "", pageSize = 500 }) {
    return this.request("GET", `/open-apis/bitable/v1/apps/${baseToken}/tables/${tableId}/records`, {
      query: {
        page_size: pageSize,
        page_token: pageToken
      }
    });
  }

  batchCreateRecords({ baseToken, tableId, rows }) {
    return this.request(
      "POST",
      `/open-apis/bitable/v1/apps/${baseToken}/tables/${tableId}/records/batch_create`,
      {
        body: {
          records: rows.map((row) => ({ fields: row }))
        }
      }
    );
  }

  batchUpdateRecords({ baseToken, tableId, records }) {
    return this.request(
      "POST",
      `/open-apis/bitable/v1/apps/${baseToken}/tables/${tableId}/records/batch_update`,
      {
        body: {
          records
        }
      }
    );
  }
}
