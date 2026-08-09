export function isGoogleSheetsAuthWall(body: string): boolean {
  const trimmed = body.trim();
  return (
    trimmed.startsWith("<!DOCTYPE") ||
    trimmed.startsWith("<html") ||
    body.includes("accounts.google.com") ||
    body.includes("You must sign in to access")
  );
}

export async function fetchGoogleSheetCsv(
  sheetId: string,
  tabName: string
): Promise<string> {
  const url = `https://docs.google.com/spreadsheets/d/${sheetId}/gviz/tq?tqx=out:csv&sheet=${encodeURIComponent(tabName)}`;
  const response = await fetch(url, {
    next: { revalidate: 300 },
    headers: {
      "User-Agent": "CCDash/1.0 (+https://github.com/communitychurch/ccdash)",
    },
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch Google Sheet tab "${tabName}" (${response.status})`);
  }

  const text = await response.text();
  if (isGoogleSheetsAuthWall(text)) {
    throw new Error(
      `Google Sheet tab "${tabName}" is not publicly readable. In Google Sheets: Share → General access → Anyone with the link → Viewer.`
    );
  }

  return text;
}

export async function discoverGoogleSheetTabs(sheetId: string): Promise<string[]> {
  const response = await fetch(
    `https://docs.google.com/spreadsheets/d/${sheetId}/edit`,
    {
      next: { revalidate: 3600 },
      headers: {
        "User-Agent": "CCDash/1.0 (+https://github.com/communitychurch/ccdash)",
      },
    }
  );

  if (!response.ok) return [];

  const html = await response.text();
  if (isGoogleSheetsAuthWall(html)) return [];

  const tabs = new Set<string>();

  for (const match of html.matchAll(
    /"sheetId":\d+,"title":"((?:\\.|[^"\\])*)"/g
  )) {
    tabs.add(match[1].replace(/\\u([0-9a-fA-F]{4})/g, (_, hex) =>
      String.fromCharCode(Number.parseInt(hex, 16))
    ));
  }

  for (const match of html.matchAll(
    /"title":"((?:\\.|[^"\\])*)","sheetId":\d+/g
  )) {
    tabs.add(match[1].replace(/\\u([0-9a-fA-F]{4})/g, (_, hex) =>
      String.fromCharCode(Number.parseInt(hex, 16))
    ));
  }

  return [...tabs];
}
