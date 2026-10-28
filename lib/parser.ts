export function extractCompany(text: string): string | null {
  const lines = text.split('\n').map(l => l.trim()).filter(Boolean);
  if (!lines.length) return null;
  // Pehli line se "Tax Invoice" jaisa noise hatao
  let first = lines[0].replace(/\s*(Tax\s*Invoice|Invoice)\b.*$/i, '').trim();
  first = first.split(/Invoice\s*No/i)[0].trim();
  return first || null;
}

export function extractInvoiceNo(text: string): string | null {
  const patterns = [
    /Invoice\s*No\.?\s*[:#]?\s*([A-Za-z0-9][A-Za-z0-9\/\-_]*?)(?:\s+\d{1,2}[-/]\w{3}[-/]\d{2,4})/i,
    /Invoice\s*No\.?\s*[:#]?\s*([A-Za-z0-9][A-Za-z0-9\/\-_]+)/i,
  ];
  for (const p of patterns) {
    const m = text.match(p);
    if (m) return m[1].replace(/[.,:\-\/]+$/, '');
  }
  return null;
}