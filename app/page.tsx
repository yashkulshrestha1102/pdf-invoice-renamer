'use client';
import { useState, useRef } from 'react';
import JSZip from 'jszip';
import { extractTextFromPDF } from '@/lib/pdfUtils';
import { extractCompany, extractInvoiceNo } from '@/lib/parser';

export default function Home() {
  const [processing, setProcessing] = useState(false);
  const [logs, setLogs] = useState<string[]>([]);
  const [isSuccess, setIsSuccess] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

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
        setLogs(['❌ No PDF files found inside the ZIP.']);
        setProcessing(false);
        return;
      }

      setLogs(prev => [...prev, `🔍 Found ${pdfEntries.length} PDFs. Processing started...`]);
      
      const outZip = new JSZip();
      const usedNames = new Set<string>();
      let successCount = 0;
      
      // Variable to store the company name for the final zip file
      let zipCompanyName = "Renamed_Invoices"; 

      for (const entry of pdfEntries) {
        const blob = await entry.async('blob');
        const pdfFile = new File([blob], entry.name, { type: 'application/pdf' });
        
        try {
          const text = await extractTextFromPDF(pdfFile);
          const company = extractCompany(text);
          const invoice = extractInvoiceNo(text);

          if (!company || !invoice) {
            setLogs(prev => [...prev, `⚠️ Skipped: ${entry.name} (Missing data)`]);
            continue;
          }

          // Save the first detected company name for the ZIP file name
          if (zipCompanyName === "Renamed_Invoices") {
            zipCompanyName = company;
          }

          // Sanitize filename
          let base = `${company}_${invoice}`.replace(/[\\/*?:"<>|]/g, '-').replace(/\s+/g, ' ');
          let name = `${base}.pdf`;
          let count = 1;
          while (usedNames.has(name)) name = `${base}_${count++}.pdf`;
          usedNames.add(name);

          outZip.file(name, blob);
          successCount++;
          setLogs(prev => [...prev, `✅ ${entry.name} ➔ ${name}`]);
          
        } catch (err) {
          setLogs(prev => [...prev, `❌ Error processing: ${entry.name}`]);
        }
      }

      if (successCount > 0) {
        const outBlob = await outZip.generateAsync({ type: 'blob', compression: 'DEFLATE' });
        const url = URL.createObjectURL(outBlob);
        const a = document.createElement('a');
        a.href = url;
        
        // Set the ZIP file name to the company name
        let safeZipName = zipCompanyName.replace(/[\\/*?:"<>|]/g, '-').trim();
        a.download = `${safeZipName}.zip`; 
        
        a.click();
        URL.revokeObjectURL(url);
        
        setIsSuccess(true);
        setLogs(prev => [...prev, `🎉 Success! ${successCount} PDFs renamed and "${safeZipName}.zip" downloaded.`]);
      } else {
        setLogs(prev => [...prev, `❌ Failed to rename any PDFs.`]);
      }

    } catch (err) {
      setLogs(prev => [...prev, `❌ Invalid ZIP file or read error.`]);
    } finally {
      setProcessing(false);
      // Reset file input so same file can be selected again
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  return (
    <main className="min-h-screen bg-[#0a0a0a] text-gray-200 p-6 md:p-12 flex flex-col items-center font-sans selection:bg-blue-500/30">
      <div className="w-full max-w-3xl mt-8">
        
        {/* Header */}
        <div className="text-center mb-10">
          <h1 className="text-4xl md:text-5xl font-extrabold mb-4 text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-purple-500 tracking-tight">
            PDF Invoice Renamer
          </h1>
          <p className="text-gray-400 text-lg">
            Upload a ZIP file. We'll automatically extract the Company Name and Invoice Number to rename them.
          </p>
        </div>

        {/* Main Card */}
        <div className="bg-[#121212] p-6 md:p-10 rounded-2xl border border-white/5 shadow-2xl backdrop-blur-sm">
          
          {/* Upload Area */}
          <div 
            onClick={() => !processing && fileInputRef.current?.click()}
            className={`group relative flex flex-col items-center justify-center border-2 border-dashed rounded-xl p-12 transition-all duration-300 ease-in-out cursor-pointer
              ${processing ? 'border-gray-700 bg-gray-800/20 opacity-50 cursor-not-allowed' : 'border-gray-600 hover:border-blue-500 hover:bg-blue-500/5'}`}
          >
            <input 
              type="file" 
              accept=".zip" 
              onChange={handleZip} 
              disabled={processing}
              ref={fileInputRef}
              className="hidden" 
            />
            
            <div className="w-16 h-16 mb-4 rounded-full bg-gray-800 flex items-center justify-center group-hover:scale-110 transition-transform duration-300 group-hover:bg-blue-500/20">
              <svg className="w-8 h-8 text-gray-400 group-hover:text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"></path>
              </svg>
            </div>
            
            <p className="text-lg font-semibold text-gray-300 mb-1">
              {processing ? 'Processing your files...' : 'Click to upload ZIP file'}
            </p>
            <p className="text-sm text-gray-500">
              Only .zip files containing PDFs are supported
            </p>
          </div>

          {/* Processing Indicator */}
          {processing && (
            <div className="mt-6 flex items-center justify-center gap-3 text-blue-400 bg-blue-950/40 p-4 rounded-xl border border-blue-900/50 animate-pulse">
              <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              <span className="font-medium">Extracting data and renaming...</span>
            </div>
          )}

          {/* Success Message */}
          {isSuccess && (
            <div className="mt-6 p-4 bg-emerald-950/40 border border-emerald-900/50 rounded-xl text-emerald-400 text-center font-medium flex items-center justify-center gap-2">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path></svg>
              Processing Complete! Your ZIP file has been downloaded.
            </div>
          )}

          {/* Activity Logs */}
          {logs.length > 0 && (
            <div className="mt-8">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wider">Activity Logs</h3>
                {logs.length > 0 && !processing && (
                  <button onClick={() => setLogs([])} className="text-xs text-gray-500 hover:text-gray-300 transition-colors">Clear Logs</button>
                )}
              </div>
              <div className="bg-[#050505] rounded-xl p-5 max-h-72 overflow-y-auto border border-white/5 custom-scrollbar">
                <div className="text-sm font-mono whitespace-pre-wrap space-y-1.5">
                  {logs.map((l, i) => (
                    <div key={i} className={`flex items-start gap-2 ${l.includes('✅') ? 'text-emerald-400' : l.includes('❌') ? 'text-red-400' : l.includes('⚠️') ? 'text-yellow-400' : l.includes('🎉') ? 'text-blue-400 font-bold mt-2' : 'text-gray-300'}`}>
                      <span className="opacity-50 text-xs mt-1">{i + 1}.</span>
                      <span className="break-all">{l}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </main>
  );
}