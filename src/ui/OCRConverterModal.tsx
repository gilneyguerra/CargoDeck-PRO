import { useState, useRef, type ChangeEvent } from 'react';
import { createPortal } from 'react-dom';
import { X, UploadCloud, FileText, CheckCircle2, Loader2, Download, AlertCircle } from 'lucide-react';
import { createWorker } from 'tesseract.js';
import { loadPdfJs } from '../services/pdfLoader';

interface FileProgress {
  name: string; file: File; status: 'pending' | 'processing' | 'done' | 'error'; progress: number; result?: string; error?: string;
}

export function OCRConverterModal({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
  const [files, setFiles] = useState<FileProgress[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  const handleFileSelect = (e: ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const fileList = Array.from(e.target.files) as File[];
      const newFiles = fileList.map((f: File) => ({ name: f.name, file: f, status: 'pending' as const, progress: 0 }));
      setFiles(prev => [...prev, ...newFiles]);
    }
  };

  const processFiles = async () => {
    setIsProcessing(true);
    for (let i = 0; i < files.length; i++) {
        if (files[i].status !== 'pending') continue;
        const currentFile = files[i];
        setFiles(prev => prev.map((f, idx) => idx === i ? { ...f, status: 'processing' } : f));
        try {
            const text = await performOCR(currentFile.file, (p) => {
                setFiles(prev => prev.map((f, idx) => idx === i ? { ...f, progress: Math.round(p * 100) } : f));
            });
            setFiles(prev => prev.map((f, idx) => idx === i ? { ...f, status: 'done', result: text, progress: 100 } : f));
        } catch (err: unknown) {
            setFiles(prev => prev.map((f, idx) => idx === i ? { ...f, status: 'error', error: err instanceof Error ? err.message : String(err) } : f));
        }
    }
    setIsProcessing(false);
  };

  const performOCR = async (file: File, onProgress: (p: number) => void): Promise<string> => {
    const pdfjsLib: any = await loadPdfJs();
    const pdf = await pdfjsLib.getDocument({ data: await file.arrayBuffer() }).promise;
    let fullText = '';
    const worker = await createWorker('por' as any, 1, { logger: m => { if (m.status === 'recognizing text') (onProgress as any)(m.progress); } });
    try {
        for (let i = 1; i <= pdf.numPages; i++) {
            const page = await pdf.getPage(i);
            const viewport = page.getViewport({ scale: 2.0 });
            const canvas = document.createElement('canvas');
            const context = canvas.getContext('2d');
            canvas.height = viewport.height; canvas.width = viewport.width;
            if (context) {
                await page.render({ canvasContext: context, viewport, canvas }).promise;
                const { data: { text } } = await worker.recognize(canvas);
                fullText += text + '\n';
            }
        }
    } finally { await worker.terminate(); }
    return fullText;
  };

  const downloadResult = (file: FileProgress) => {
    if (!file.result) return;
    const blob = new Blob([file.result], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = `manifesto_${file.name.replace('.pdf', '')}_extracted.txt`;
    a.click(); URL.revokeObjectURL(url);
  };

  const downloadAll = () => {
    const doneFiles = files.filter(f => f.status === 'done' && f.result);
    if (doneFiles.length === 0) return;
    const combined = doneFiles.map(f => `FILE: ${f.name}\n${'='.repeat(20)}\n${f.result}\n\n`).join('\n');
    const blob = new Blob([combined], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = `all_manifests_extracted.txt`;
    a.click(); URL.revokeObjectURL(url);
  };

  return createPortal(
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[9999] flex items-center justify-center p-4 animate-in fade-in duration-300 font-sans">
      <div className="bg-header border-2 border-subtle rounded-[3rem] w-full max-w-4xl shadow-high relative flex flex-col max-h-[90vh] overflow-hidden animate-in zoom-in-95 duration-200 glass">
        <div className="absolute top-0 left-0 w-full h-1.5 bg-gradient-to-r from-brand-primary via-indigo-500 to-brand-primary z-50" />
        
        {/* Header Section */}
        <div className="px-10 pt-10 pb-8 border-b border-subtle shrink-0">
            <button onClick={onClose} className="absolute top-8 right-10 text-primary hover:text-brand-primary p-2 hover:bg-main rounded-full transition-all">
                <X className="w-7 h-7" />
            </button>
            <div className="flex flex-col gap-2">
                <h2 className="text-3xl font-black text-primary tracking-tighter uppercase leading-none">Advanced OCR Hub</h2>
                <p className="text-[10px] font-black text-secondary uppercase tracking-[0.4em] opacity-90">AI-Powered Manifest Analytics</p>
            </div>
        </div>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto no-scrollbar p-10">
            <div className="flex flex-col gap-8">
                {files.length === 0 && (
                    <div 
                        onClick={() => fileInputRef.current?.click()}
                        className="flex-1 border-4 border-dashed border-subtle/50 rounded-[3rem] flex flex-col items-center justify-center py-24 gap-8 hover:border-brand-primary/50 hover:bg-brand-primary/5 transition-all cursor-pointer group shadow-inner"
                    >
                        <div className="p-10 bg-brand-primary/10 rounded-full text-brand-primary group-hover:scale-110 transition-transform shadow-medium border-2 border-brand-primary/20">
                            <UploadCloud className="w-16 h-16" />
                        </div>
                        <div className="text-center space-y-3">
                            <p className="text-2xl font-black text-primary uppercase tracking-tight">Ingest Manifest Objects</p>
                            <p className="text-[11px] text-secondary font-bold uppercase tracking-[0.3em] opacity-80">Click to discover local drivers or drag secure PDFs here</p>
                        </div>
                        <input type="file" multiple accept="application/pdf" className="hidden" ref={fileInputRef} onChange={handleFileSelect} />
                    </div>
                )}

                {files.length > 0 && (
                    <div className="space-y-4">
                        {files.map((file, idx) => (
                            <div key={idx} className="bg-main/40 border-2 border-subtle rounded-[2rem] p-6 flex items-center gap-6 group transition-all hover:border-brand-primary/40 hover:shadow-medium shadow-inner">
                                <div className="p-4 bg-header rounded-2xl shadow-low border-2 border-subtle group-hover:scale-110 transition-transform">
                                    <FileText className="w-8 h-8 text-brand-primary" />
                                </div>
                                <div className="flex-1 min-w-0">
                                    <div className="flex justify-between items-start mb-3">
                                        <h4 className="text-sm font-black text-primary truncate pr-6 uppercase tracking-tight">{file.name}</h4>
                                        <span className={cn(
                                            "text-[10px] font-black uppercase tracking-widest px-4 py-1.5 rounded-full shadow-low border border-white/10",
                                            file.status === 'done' ? "text-white bg-status-success" :
                                            file.status === 'processing' ? "text-white bg-brand-primary animate-pulse" :
                                            file.status === 'error' ? "text-white bg-status-error" :
                                            "text-primary bg-sidebar border-subtle"
                                        )}>
                                            {file.status}
                                        </span>
                                    </div>
                                    <div className="w-full bg-sidebar rounded-full h-3 overflow-hidden border-2 border-subtle shadow-inner">
                                        <div 
                                            className={cn(
                                                "h-full transition-all duration-1000 ease-out",
                                                file.status === 'error' ? "bg-status-error" : "bg-gradient-to-r from-brand-primary to-indigo-500"
                                            )}
                                            style={{ width: `${file.progress}%` }}
                                        />
                                    </div>
                                    {file.error && <p className="text-[10px] font-black text-status-error mt-3 flex items-center gap-2 uppercase tracking-wide"><AlertCircle size={14}/> {file.error}</p>}
                                </div>
                                {file.status === 'done' && (
                                    <button 
                                        onClick={() => downloadResult(file)}
                                        className="p-3.5 text-brand-primary bg-brand-primary/5 hover:bg-brand-primary/10 border-2 border-brand-primary/20 rounded-2xl transition-all shadow-low"
                                        title="Download Extraction"
                                    >
                                        <Download className="w-6 h-6" />
                                    </button>
                                )}
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>

        {/* Footer Section */}
        <div className="px-10 py-10 border-t border-subtle bg-sidebar shrink-0">
            <div className="flex gap-6 mb-8">
                <button 
                    onClick={() => { setFiles([]); setIsProcessing(false); }}
                    className="flex-1 py-5 text-xs font-black text-secondary hover:text-primary uppercase tracking-[0.25em] transition-all"
                    disabled={isProcessing}
                >
                    Clear Queue
                </button>
                {files.some(f => f.status === 'pending') ? (
                    <button 
                        onClick={processFiles} disabled={isProcessing}
                        className="flex-[2] py-5 bg-brand-primary text-white rounded-2xl text-xs font-black uppercase tracking-[0.25em] shadow-xl shadow-brand-primary/20 hover:brightness-110 active:scale-95 transition-all flex items-center justify-center gap-4"
                    >
                        {isProcessing ? <Loader2 className="w-5 h-5 animate-spin" /> : <CheckCircle2 className="w-5 h-5" />}
                        {isProcessing ? 'Processing Manifests...' : 'Initiate OCR Protocol'}
                    </button>
                ) : files.some(f => f.status === 'done') ? (
                    <button 
                        onClick={downloadAll}
                        className="flex-[2] py-5 bg-gradient-to-br from-emerald-500 to-emerald-600 text-white rounded-2xl text-xs font-black uppercase tracking-[0.25em] shadow-xl shadow-emerald-500/20 hover:brightness-110 active:scale-95 transition-all flex items-center justify-center gap-4"
                    >
                        <Download className="w-5 h-5" /> Export Integrated Data
                    </button>
                ) : (
                    <button 
                        onClick={() => fileInputRef.current?.click()}
                        className="flex-[2] py-5 bg-header border-2 border-subtle text-primary rounded-2xl text-xs font-black uppercase tracking-[0.25em] hover:bg-main transition-all shadow-low"
                    >
                        Queue Additional Docs
                    </button>
                )}
            </div>
            
            <div className="flex items-center gap-4 text-secondary/60">
                <AlertCircle size={14} className="shrink-0" />
                <p className="text-[10px] font-black leading-relaxed uppercase tracking-[0.15em]">
                    Compliance Notice: Local edge processing active. All data remains within the shipboard local session security perimeter.
                </p>
            </div>
        </div>
      </div>
    </div>,
    document.body
  );
}

function cn(...classes: (string | boolean | undefined)[]) { return classes.filter(Boolean).join(' '); }
