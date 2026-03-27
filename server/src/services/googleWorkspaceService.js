const { google } = require('googleapis');
const { decrypt } = require('../utils/encryption');

function getOAuth2Client() {
  return new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    process.env.GOOGLE_REDIRECT_URI
  );
}

/**
 * Get a valid access token from a CalendarIntegration record,
 * refreshing if expired.
 */
async function getAccessToken(prisma, integration) {
  // Refresh if expired
  if (integration.expiresAt && new Date(integration.expiresAt) <= new Date()) {
    const oauth2 = getOAuth2Client();
    const refreshToken = decrypt(integration.refreshToken);
    if (!refreshToken) throw new Error('No refresh token available');

    oauth2.setCredentials({ refresh_token: refreshToken });
    const { credentials } = await oauth2.refreshAccessToken();

    const { encrypt } = require('../utils/encryption');
    const encryptedAccess = encrypt(credentials.access_token);
    await prisma.calendarIntegration.update({
      where: { id: integration.id },
      data: {
        accessToken: encryptedAccess,
        expiresAt: credentials.expiry_date ? new Date(credentials.expiry_date) : null,
      },
    });

    return credentials.access_token;
  }

  return decrypt(integration.accessToken);
}

/**
 * Resolve a CalendarIntegration from userId + integrationId.
 */
async function getIntegration(prisma, userId, integrationId) {
  const integration = await prisma.calendarIntegration.findFirst({
    where: { id: parseInt(integrationId), userId: parseInt(userId), provider: 'google' },
  });
  if (!integration) throw new Error('Google integration not found');
  return integration;
}

// ─── Google Sheets ──────────────────────────────────────────

async function listSpreadsheets(prisma, userId, integrationId, query) {
  const integration = await getIntegration(prisma, userId, integrationId);
  const token = await getAccessToken(prisma, integration);

  let q = "mimeType='application/vnd.google-apps.spreadsheet' and trashed=false";
  if (query) q += ` and name contains '${query.replace(/'/g, "\\'")}'`;

  const url = `https://www.googleapis.com/drive/v3/files?q=${encodeURIComponent(q)}&fields=files(id,name,modifiedTime)&orderBy=modifiedTime desc&pageSize=50`;
  const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
  if (!res.ok) throw new Error(`Drive API error: ${res.status} ${await res.text()}`);
  const data = await res.json();
  return data.files || [];
}

async function getSpreadsheet(prisma, userId, integrationId, spreadsheetId) {
  const integration = await getIntegration(prisma, userId, integrationId);
  const token = await getAccessToken(prisma, integration);

  const url = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}?fields=spreadsheetId,properties.title,sheets.properties`;
  const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
  if (!res.ok) throw new Error(`Sheets API error: ${res.status} ${await res.text()}`);
  const data = await res.json();

  return {
    id: data.spreadsheetId,
    title: data.properties.title,
    sheets: (data.sheets || []).map(s => ({
      sheetId: s.properties.sheetId,
      title: s.properties.title,
      rowCount: s.properties.gridProperties?.rowCount,
      columnCount: s.properties.gridProperties?.columnCount,
    })),
  };
}

async function readSheet(prisma, userId, integrationId, spreadsheetId, range) {
  const integration = await getIntegration(prisma, userId, integrationId);
  const token = await getAccessToken(prisma, integration);

  const url = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${encodeURIComponent(range)}`;
  const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
  if (!res.ok) throw new Error(`Sheets API error: ${res.status} ${await res.text()}`);
  const data = await res.json();
  return { range: data.range, values: data.values || [] };
}

async function writeSheet(prisma, userId, integrationId, spreadsheetId, range, values) {
  const integration = await getIntegration(prisma, userId, integrationId);
  const token = await getAccessToken(prisma, integration);

  const url = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${encodeURIComponent(range)}?valueInputOption=USER_ENTERED`;
  const res = await fetch(url, {
    method: 'PUT',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ range, majorDimension: 'ROWS', values }),
  });
  if (!res.ok) throw new Error(`Sheets API error: ${res.status} ${await res.text()}`);
  const data = await res.json();
  return { updatedRange: data.updatedRange, updatedRows: data.updatedRows, updatedColumns: data.updatedColumns };
}

async function appendSheet(prisma, userId, integrationId, spreadsheetId, range, values) {
  const integration = await getIntegration(prisma, userId, integrationId);
  const token = await getAccessToken(prisma, integration);

  const url = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${encodeURIComponent(range)}:append?valueInputOption=USER_ENTERED&insertDataOption=INSERT_ROWS`;
  const res = await fetch(url, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ range, majorDimension: 'ROWS', values }),
  });
  if (!res.ok) throw new Error(`Sheets API error: ${res.status} ${await res.text()}`);
  const data = await res.json();
  return { updatedRange: data.updates?.updatedRange, updatedRows: data.updates?.updatedRows };
}

async function createSpreadsheet(prisma, userId, integrationId, title) {
  const integration = await getIntegration(prisma, userId, integrationId);
  const token = await getAccessToken(prisma, integration);

  const url = 'https://sheets.googleapis.com/v4/spreadsheets';
  const res = await fetch(url, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ properties: { title } }),
  });
  if (!res.ok) throw new Error(`Sheets API error: ${res.status} ${await res.text()}`);
  const data = await res.json();
  return { id: data.spreadsheetId, title: data.properties.title, url: data.spreadsheetUrl };
}

// ─── Google Docs ────────────────────────────────────────────

async function listDocuments(prisma, userId, integrationId, query) {
  const integration = await getIntegration(prisma, userId, integrationId);
  const token = await getAccessToken(prisma, integration);

  let q = "mimeType='application/vnd.google-apps.document' and trashed=false";
  if (query) q += ` and name contains '${query.replace(/'/g, "\\'")}'`;

  const url = `https://www.googleapis.com/drive/v3/files?q=${encodeURIComponent(q)}&fields=files(id,name,modifiedTime)&orderBy=modifiedTime desc&pageSize=50`;
  const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
  if (!res.ok) throw new Error(`Drive API error: ${res.status} ${await res.text()}`);
  const data = await res.json();
  return data.files || [];
}

async function getDocument(prisma, userId, integrationId, documentId) {
  const integration = await getIntegration(prisma, userId, integrationId);
  const token = await getAccessToken(prisma, integration);

  const url = `https://docs.googleapis.com/v1/documents/${documentId}`;
  const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
  if (!res.ok) throw new Error(`Docs API error: ${res.status} ${await res.text()}`);
  const doc = await res.json();

  // Extract plain text from structural content
  let text = '';
  for (const element of doc.body?.content || []) {
    if (element.paragraph) {
      for (const el of element.paragraph.elements || []) {
        if (el.textRun) text += el.textRun.content;
      }
    }
    if (element.table) {
      for (const row of element.table.tableRows || []) {
        const cells = [];
        for (const cell of row.tableCells || []) {
          let cellText = '';
          for (const p of cell.content || []) {
            if (p.paragraph) {
              for (const el of p.paragraph.elements || []) {
                if (el.textRun) cellText += el.textRun.content;
              }
            }
          }
          cells.push(cellText.trim());
        }
        text += cells.join('\t') + '\n';
      }
    }
  }

  return { id: doc.documentId, title: doc.title, text: text.trim() };
}

async function createDocument(prisma, userId, integrationId, title) {
  const integration = await getIntegration(prisma, userId, integrationId);
  const token = await getAccessToken(prisma, integration);

  const url = 'https://docs.googleapis.com/v1/documents';
  const res = await fetch(url, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ title }),
  });
  if (!res.ok) throw new Error(`Docs API error: ${res.status} ${await res.text()}`);
  const doc = await res.json();
  return { id: doc.documentId, title: doc.title };
}

async function appendToDocument(prisma, userId, integrationId, documentId, text) {
  const integration = await getIntegration(prisma, userId, integrationId);
  const token = await getAccessToken(prisma, integration);

  // First get the document to find the end index
  const getUrl = `https://docs.googleapis.com/v1/documents/${documentId}`;
  const getRes = await fetch(getUrl, { headers: { Authorization: `Bearer ${token}` } });
  if (!getRes.ok) throw new Error(`Docs API error: ${getRes.status} ${await getRes.text()}`);
  const doc = await getRes.json();

  const endIndex = doc.body?.content?.slice(-1)?.[0]?.endIndex || 1;
  // Insert before the final newline (endIndex - 1)
  const insertIndex = Math.max(endIndex - 1, 1);

  const batchUrl = `https://docs.googleapis.com/v1/documents/${documentId}:batchUpdate`;
  const batchRes = await fetch(batchUrl, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      requests: [{ insertText: { location: { index: insertIndex }, text: '\n' + text } }],
    }),
  });
  if (!batchRes.ok) throw new Error(`Docs API error: ${batchRes.status} ${await batchRes.text()}`);
  return { success: true };
}

module.exports = {
  listSpreadsheets,
  getSpreadsheet,
  readSheet,
  writeSheet,
  appendSheet,
  createSpreadsheet,
  listDocuments,
  getDocument,
  createDocument,
  appendToDocument,
};
