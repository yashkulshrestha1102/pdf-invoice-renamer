export function extractCompany(text: string): string | null {
  // Text ki shuruaat se pehla Capital Word (jaise CARRETX) dhoondho
  // Regex: 2 se 20 letters ka word jo capital mein shuru ho
  const match = text.match(/\b([A-Z][A-Z0-9]{2,20})\b/);
  
  if (match) {
    return match[1]; // Sirf pehla word (CARRETX) return karega
  }
  
  // Fallback: Agar sab capital mein nahi hai, toh pehla normal word utha lo
  const words = text.trim().split(/\s+/);
  return words[0].replace(/[^A-Za-z0-9]/g, '') || null;
}

export function extractInvoiceNo(text: string): string | null {
  // "Invoice No." ke theek baad wala text uthayega
  const patterns = [
    /Invoice\s*No\.?\s*\n?([A-Za-z0-9\/\-_]+)/i,
    /Invoice\s*No\.?\s*([A-Za-z0-9\/\-_]+)/i,
  ];
  
  for (const p of patterns) {
    const m = text.match(p);
    if (m) {
      let inv = m[1].trim();
      // Agar OV/26-27/406 ke aage date ya kuch aur chipka hai, toh sirf number rakho
      if (inv.includes('/')) {
         inv = inv.split(/\s+/)[0]; 
      }
      // Extra dash ya dot hatao
      inv = inv.replace(/[.,:\-\/]+$/, '');
      
      return inv;
    }
  }
  return null;
}