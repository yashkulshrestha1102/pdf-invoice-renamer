export function extractCompany(text: string): string | null {
  const lines = text.split('\n').map(l => l.trim()).filter(Boolean);
  if (!lines.length) return null;
  
  for (let line of lines) {
    // 1. Line se "Tax Invoice" hatao
    let cleanLine = line.replace(/^Tax\s*Invoice\s*/i, '').trim();
    
    // 2. Agar line khaali ho gayi toh aage badho
    if (!cleanLine) continue;

    // 3. Line ko words mein todo (space ke hisaab se)
    const words = cleanLine.split(/\s+/);
    
    // 4. Pehla word uthao
    let firstWord = words[0];
    
    // 5. Pehle word se faltu symbols (jaise comma, dash) hatao
    firstWord = firstWord.replace(/^[^A-Za-z0-9]+|[^A-Za-z0-9]+$/g, '');
    
    // 6. Agar pehla word "Invoice" ya "Tax" hai, toh agla word uthao
    if (/^(Invoice|Tax|No|Date)$/i.test(firstWord) && words.length > 1) {
      firstWord = words[1].replace(/^[^A-Za-z0-9]+|[^A-Za-z0-9]+$/g, '');
    }

    // 7. Agar word valid hai (khaali nahi hai aur number nahi hai), toh return kar do
    if (firstWord && firstWord.length > 1 && isNaN(Number(firstWord))) {
      return firstWord;
    }
  }
  
  return null;
}

export function extractInvoiceNo(text: string): string | null {
  // 1. "Invoice No" ke baad ka text dhoondho
  const invoicePatterns = [
    /Invoice\s*(?:No|Number|#)\.?\s*[:#\-]?\s*\n?([A-Za-z0-9][A-Za-z0-9\/\-_]+)/i,
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

  // 2. Fallback (Agar Invoice No nahi mila, toh PO ya OV format dhoondho)
  const fallbackPatterns = [
    /(PO[\s\-:\/]*[A-Za-z0-9\-]+)/i, 
    /\b([A-Z0-9]{2,6}[\/\-][A-Z0-9\/\-]{3,20})\b/i 
  ];

  for (const p of fallbackPatterns) {
    const m = text.match(p);
    if (m) {
      let inv = m[1].trim().replace(/\s+/g, '-');
      return inv.replace(/[.,:\-\/]+$/, '');
    }
  }

  return null;
}