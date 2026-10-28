'use client';
import { useState } from 'react';
import JSZip from 'jszip';
import { extractTextFromPDF } from '@/lib/pdfUtils';
import { extractCompany, extractInvoiceNo } from '@/lib/parser';

export default function Home() {
  const [processing, setProcessing] = useState(false);
  const [logs, setLogs] = useState<string[]>([]);

  const handleZip = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setProcessing(true);
    setLogs([]);

    try {
      const zip = await JSZip.loadAsync(file);
      const pdfEntries = Object.values(zip.files).filter(f => !f.dir && f.name.toLowerCase().endsWith('.pdf'));
      const outZip = new JSZip();
      const usedNames = new Set<string>();

      for (const entry of pdfEntries) {
        const blob = await entry.async('blob');
        const pdfFile = new File([blob], entry.name, { type: 'application/pdf' });
        const text = await extractTextFromPDF(pdfFile);
        const company = extractCompany(text);
        const invoice = extractInvoiceNo(text);

        if (!company || !invoice) {
          setLogs(prev => [...prev, `⚠️ Skip: ${entry.name} (fields missing)`]);
          continue;
        }

        let base = `${company}_${invoice}`.replace(/[\\/*?:"<>|]/g, '-').replace(/\s+/g, ' ');
        let name = `${base}.pdf`;
        let count = 1;
        while (usedNames.has(name)) name = `${base}_${count++}.pdf`;
        usedNames.add(name);

        outZip.file(name, blob);
        setLogs(prev => [...prev, `✅ ${entry.name} → ${name}`]);
      }

      const outBlob = await outZip.generateAsync({ type: 'blob', compression: 'DEFLATE' });
      const url = URL.createObjectURL(outBlob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'renamed_invoices.zip';
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      setLogs(prev => [...prev, `❌ Error: ${err}`]);
    } finally {
      setProcessing(false);
    }
  };

  return (
    <main className="p-8 max-w-2xl mx-auto">
      <h1 className="text-2xl font-bold mb-4">PDF Invoice Renamer</h1>
      <input type="file" accept=".zip" onChange={handleZip} disabled={processing} className="mb-4" />
      {processing && <p>Processing... (browser mein ho raha hai, wait karo)</p>}
      <div className="mt-4 text-sm font-mono whitespace-pre-wrap">
        {logs.map((l, i) => <div key={i}>{l}</div>)}
      </div>
    </main>
  );
}