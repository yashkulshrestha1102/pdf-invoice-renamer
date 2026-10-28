export function extractCompany(text: string): string | null {
  const lines = text.split('\n').map(l => l.trim()).filter(Boolean);
  if (!lines.length) return null;
  
  for (let line of lines) {
    // Address aur GST wali lines ko skip karo
    if (/(SHOP|FLOOR|ROAD|NAGAR|KUNDA|BENGALURU|DEOGHAR|JHARKHAND|KARNATAKA|GSTIN|CIN|STATE|PIN|CODE)/i.test(line)) {
      continue;
    }

    // Agar line mein "Private Limited", "Pvt Ltd", "LLP" etc. hai (Company ka signature)
    if (/Private Limited|Pvt\.?\s*Ltd\.?|LLP|Corporation|Inc\.?|Company/i.test(line)) {
      // Line ko saaf karo
      let cleanLine = line.split(/Invoice\s*No|Tax\s*Invoice/i)[0].trim();
      cleanLine = cleanLine.replace(/^Tax\s*Invoice\s*/i, '').replace(/Tax\s*Invoice\s*/i, '').trim();
      cleanLine = cleanLine.replace(/^[.,:\-\s]+|[.,:\-\s]+$/g, '');
      
      if (cleanLine.length > 3 && !cleanLine.toLowerCase().includes('invoice')) {
        return cleanLine;
      }
    }
  }
  
  // FALLBACK (Agar upar se na mile): Pehli aisi line uthao jisme koi Capital word ho
  for (let line of lines) {
    if (/(SHOP|FLOOR|ROAD|GSTIN|CIN|STATE)/i.test(line)) continue;
    // Agar line mein 3 se zyada letters hain aur woh koi heading nahi hai
    if (line.length > 3 && !/Invoice|Date|Note|Order/i.test(line)) {
       return line.replace(/^Tax\s*Invoice\s*/i, '').trim();
    }
  }

  return null;
}

export function extractInvoiceNo(text: string): string | null {
  // 1. Check karo agar "Invoice No" likha hai
  const invoicePatterns = [
    /Invoice\s*(?:No|Number|#)\.?\s*[:#\-]?\s*([A-Za-z0-9][A-Za-z0-9\/\-_]+)/i,
    /INV[\s\-:/]*([A-Za-z0-9\/\-_]+)/i
  ];
  
  for (const p of invoicePatterns) {
    const m = text.match(p);
    if (m) {
      let inv = m[1].trim().split(/\s+/)[0].replace(/[.,:\-\/]+$/, '');
      if (inv.length > 2) return inv;
    }
  }

  // 2. UNIVERSAL FALLBACK: Agar "Invoice No" nahi mila, toh text mein se koi bhi "PO-XXXX" ya lamba alphanumeric code dhoondho
  const fallbackPatterns = [
    /(PO[\s\-:\/]*[A-Za-z0-9\-]+)/i, // e.g. PO 2026-2027/GS-PO-...
    /\b([A-Z0-9]{2,5}[\/\-][A-Z0-9\/\-]{3,20})\b/i // Generic format (jaise OV/26-27/413 ya GS/123/2026)
  ];

  for (const p of fallbackPatterns) {
    const m = text.match(p);
    if (m) {
      let inv = m[1].trim().replace(/\s+/g, '-'); // spaces ko dash mein badlo
      return inv.replace(/[.,:\-\/]+$/, '');
    }
  }

  return null;
}