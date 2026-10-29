export function extractCompany(text: string): string | null {
  // Text ko lines mein todo
  const lines = text.split('\n').map(l => l.trim()).filter(Boolean);
  if (!lines.length) return null;
  
  let companyName = "";

  // 1. Sabse pehle "Private Limited" / "Pvt Ltd" / "LLP" jaisi lines dhoondho (Sabse accurate)
  for (let line of lines) {
    if (/Private Limited|Pvt\.?\s*Ltd\.?|LLP|Corporation|Inc\.?|Company/i.test(line)) {
      
      // Address wale words ko skip karo agar woh usi line mein hain
      if (/(SHOP|FLOOR|ROAD|NAGAR|GSTIN|CIN|STATE|CODE)/i.test(line)) continue;

      // Line se faltu words hatao
      let cleanLine = line.replace(/^Tax\s*Invoice\s*/i, '').split(/Invoice\s*No/i)[0].trim();
      cleanLine = cleanLine.replace(/^[.,:\-\s]+|[.,:\-\s]+$/g, '');
      
      if (cleanLine.length > 3 && !cleanLine.toLowerCase().includes('invoice')) {
        // Sirf pehla word return karo
        return cleanLine.split(/\s+/)[0].replace(/^[^A-Za-z0-9]+|[^A-Za-z0-9]+$/g, '');
      }
    }
  }

  // 2. FALLBACK (Agar upar wala nahi mila): Pehli 5 lines mein se koi bhi saaf line dhoondho
  for (let i = 0; i < Math.min(lines.length, 5); i++) {
    let line = lines[i];
    
    // Agar line mein address, dates, ya invoice number jaisa kuch hai, toh skip karo
    if (/(SHOP|FLOOR|ROAD|NAGAR|GSTIN|CIN|STATE|CODE|PIN|Date|No\.|Invoice|Tax)/i.test(line)) continue;
    
    // Line ko saaf karo
    let cleanLine = line.replace(/^[.,:\-\s]+|[.,:\-\s]+$/g, '');
    
    // Pehla word uthao
    if (cleanLine.length > 2 && isNaN(Number(cleanLine.split(' ')[0]))) {
       return cleanLine.split(/\s+/)[0].replace(/^[^A-Za-z0-9]+|[^A-Za-z0-9]+$/g, '');
    }
  }

  // 3. Last Resort: Jo bhi pehla word mile
  let fallbackWord = lines[0].replace(/^Tax\s*Invoice\s*/i, '').split(/\s+/)[0];
  fallbackWord = fallbackWord.replace(/^[^A-Za-z0-9]+|[^A-Za-z0-9]+$/g, '');
  
  return fallbackWord.length > 1 ? fallbackWord : null;
}


export function extractInvoiceNo(text: string): string | null {
  // 1. Standard Invoice No. Patterns (Sabse pehle yahi try karega)
  const invoicePatterns = [
    // "Invoice No", "Invoice Number", "Inv No" ke baad ka text
    /(?:Invoice|Inv)\s*(?:No|Number|#)\.?\s*[:#\-]?\s*\n?([A-Za-z0-9][A-Za-z0-9\/\-_]+)/i,
    /(?:Invoice|Inv)\s*(?:No|Number|#)\.?\s*[:#\-]?\s*([A-Za-z0-9][A-Za-z0-9\/\-_]+)/i,
  ];
  
  for (const p of invoicePatterns) {
    const m = text.match(p);
    if (m) {
      // Sirf pehla word uthao aur faltu characters hatao
      let inv = m[1].trim().split(/\s+/)[0].replace(/[.,:\-\/]+$/, '');
      if (inv.length > 2) return inv;
    }
  }

  // 2. UNIVERSAL FALLBACK (Agar kisi ne Invoice No. nahi likha, bas number de diya hai)
  // Yeh koi bhi lamba code dhoondhega jisme letters aur numbers hon (jaise PO/123, OV/26-27/413, GS-PO-26-27-11)
  const universalPatterns = [
    // PO ke saath kuch bhi
    /(PO[\s\-:\/]*[A-Za-z0-9\-]+)/i, 
    // Koi bhi bada code jisme letters aur numbers ho (Slash ya Dash ke saath)
    /\b([A-Z0-9]{2,6}[\/\-][A-Z0-9\/\-]{3,20})\b/i,
    // Direct alphanumeric code (kam se kam 5 characters)
    /\b([A-Z0-9]{5,15})\b/i 
  ];

  for (const p of universalPatterns) {
    const m = text.match(p);
    if (m) {
      let inv = m[1].trim().replace(/\s+/g, '-');
      let cleanInv = inv.replace(/[.,:\-\/]+$/, '');
      
      // Check karo ki woh koi date (jaise 2026-2027) toh nahi hai
      if (!/^(19|20)\d{2}[\/\-](19|20)\d{2}$/.test(cleanInv)) {
        return cleanInv;
      }
    }
  }

  return null;
}