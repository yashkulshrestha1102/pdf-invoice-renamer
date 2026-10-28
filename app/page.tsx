'use client';
import { useState } from 'react';
import JSZip from 'jszip';
import { extractTextFromPDF } from '@/lib/pdfUtils';
import { extractCompany, extractInvoiceNo } from '@/lib/parser';

export default function Home() {
  const [processing, setProcessing] = useState(false);
  const [logs, setLogs] = useState<string[]>([]);
  const [isSuccess, setIsSuccess] = useState(false);

  const handleZip = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    setProcessing(true);
    setLogs([]);
    setIsSuccess(false);

    try {
      const zip = await JSZip.loadAsync(file);
      const pdfEntries = Object.values(zip.files).filter(f => !f.dir && f.name.toLowerCase().endsWith('.pdf'));
      
      if (pdfEntries.length === 0) {
        setLogs(['❌ Zip ke andar koi PDF nahi mili.']);
        setProcessing(false);
        return;
      }

      setLogs(prev => [...prev, `🔍 Total ${pdfEntries.length} PDFs mili. Processing shuru...`]);
      
      const outZip = new JSZip();
      const usedNames = new Set<string>();
      let successCount = 0;

      for (const entry of pdfEntries) {
        const blob = await entry.async('blob');
        const pdfFile = new File([blob], entry.name, { type: 'application/pdf' });
        
        try {
          const text = await extractTextFromPDF(pdfFile);
          const company = extractCompany(text);
          const invoice = extractInvoiceNo(text);

          if (!company || !invoice) {
            setLogs(prev => [...prev, `⚠️ Skip: ${entry.name} (Data nahi mila)`]);
            continue;
          }

          // Filename sanitize karo
          let base = `${company}_${invoice}`.replace(/[\\/*?:"<>|]/g, '-').replace(/\s+/g, ' ');
          let name = `${base}.pdf`;
          let count = 1;
          while (usedNames.has(name)) name = `${base}_${count++}.pdf`;
          usedNames.add(name);

          outZip.file(name, blob);
          successCount++;
          setLogs(prev => [...prev, `✅ ${entry.name} ➔ ${name}`]);
          
        } catch (err) {
          setLogs(prev => [...prev, `❌ Error: ${entry.name} (File corrupt ho sakti hai)`]);
        }
      }

      if (successCount > 0) {
        const outBlob = await outZip.generateAsync({ type: 'blob', compression: 'DEFLATE' });
        const url = URL.createObjectURL(outBlob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'Renamed_Invoices.zip';
        a.click();
        URL.revokeObjectURL(url);
        
        setIsSuccess(true);
        setLogs(prev => [...prev, `🎉 Success! ${successCount} PDFs rename ho gayi aur download shuru ho gaya.`]);
      } else {
        setLogs(prev => [...prev, `❌ Koi bhi PDF rename nahi ho payi. F12 daba kar console check karo.`]);
      }

    } catch (err) {
      setLogs(prev => [...prev, `❌ Zip read error: Invalid zip file.`]);
    } finally {
      setProcessing(false);
    }
  };

  return (
    <main className="min-h-screen bg-gray-950 text-gray-200 p-8 flex flex-col items-center">
      <div className="w-full max-w-2xl mt-10">
        <h1 className="text-3xl font-bold mb-2 text-white text-center">PDF Invoice Renamer</h1>
        <p className="text-gray-400 text-center mb-8">Upload a ZIP file. All PDFs inside will be automatically renamed.</p>

        <div className="bg-gray-900 p-8 rounded-xl border border-gray-800 shadow-2xl">
          <div className="flex flex-col items-center justify-center border-2 border-dashed border-gray-700 rounded-lg p-10 hover:bg-gray-800/50 transition-colors">
            <input 
              type="file" 
              accept=".zip" 
              onChange={handleZip} 
              disabled={processing} 
              className="block w-full text-sm text-gray-400 file:mr-4 file:py-3 file:px-6 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-600 file:text-white hover:file:bg-blue-700 cursor-pointer disabled:opacity-50"
            />
            <p className="text-xs text-gray-500 mt-4">Only .zip files containing PDFs are allowed</p>
          </div>

          {processing && (
            <div className="mt-6 flex items-center justify-center gap-3 text-blue-400 bg-blue-950/30 p-4 rounded-lg border border-blue-900/50">
              <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              <span className="font-medium">Processing... Please wait</span>
            </div>
          )}

          {isSuccess && (
            <div className="mt-6 p-4 bg-green-900/30 border border-green-800 rounded-lg text-green-400 text-center font-medium">
              🎉 Processing Complete! Your file has been downloaded.
            </div>
          )}

          {logs.length > 0 && (
            <div className="mt-6 bg-black rounded-lg p-4 max-h-80 overflow-y-auto border border-gray-800">
              <div className="text-xs text-gray-500 mb-2 font-mono uppercase tracking-wider">Activity Logs</div>
              <div className="text-sm font-mono whitespace-pre-wrap space-y-1">
                {logs.map((l, i) => (
                  <div key={i} className={l.includes('✅') ? 'text-green-400' : l.includes('❌') ? 'text-red-400' : l.includes('⚠️') ? 'text-yellow-400' : 'text-gray-300'}>
                    {l}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </main>
  );
}