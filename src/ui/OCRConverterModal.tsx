import { useState, useRef, type ChangeEvent } from 'react';
import { createPortal } from 'react-dom';
import { X, UploadCloud, FileText, CheckCircle2, Loader2, Download, AlertCircle } from 'lucide-react';
import { createWorker } from 'tesseract.js';
import { loadPdfJs } from '../services/pdfLoader';

interface FileProgress {
  name: string;
  file: File;
  status: 'pending' | 'processing' | 'done' | 'error';
  progress: number;
  result?: string;
  error?: string;
}

export function OCRConverterModal({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
  const [files, setFiles] = useState<FileProgress[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  const handleFileSelect = (e: ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const fileList = Array.from(e.target.files) as File[];
      const newFiles = fileList.map((f: File) => ({
        name: f.name,
        file: f,
        status: 'pending' as const,
        progress: 0
      }));
      setFiles(prev => [...prev, ...newFiles]);
    }
  };

  const processFiles = async () => {
    setIsProcessing(true);
    for (let i = 0; i < files.length; i++) {
        if (files[i].status !== 'pending') continue;
        const currentFile = files[i];
        const fileObj = currentFile.file as File;
        setFiles(prev => prev.map((f, idx) => idx === i ? { ...f, status: 'processing' } : f));
        try {
            const text = await performOCR(fileObj, (p) => {
                setFiles(prev => prev.map((f, idx) => idx === i ? { ...f, progress: Math.round(p * 100) } : f));
            });
            setFiles(prev => prev.map((f, idx) => idx === i ? { ...f, status: 'done', result: text, progress: 100 } : f));
        } catch (err: unknown) {
            console.error('OCR Processing Detail:', err);
            const errorMessage = err instanceof Error ? err.message : String(err);
            setFiles(prev => prev.map((f, idx) => idx === i ? { ...f, status: 'error', error: errorMessage } : f));
        }
    }
    setIsProcessing(false);
  };

  const performOCR = async (file: File, onProgress: (p: number) => void): Promise<string> => {
    const pdfjsLib: any = await loadPdfJs();
    const arrayBuffer = await file.arrayBuffer();
    const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
    let fullText = '';
    const worker = await createWorker('por' as any, 1, {
        logger: m => {
            if (m.status === 'recognizing text') (onProgress as any)(m.progress);
        }
    });
    try {
        for (let i = 1; i <= pdf.numPages; i++) {
            const page = await pdf.getPage(i);
            const viewport = page.getViewport({ scale: 2.0 });
            const canvas = document.createElement('canvas');
            const context = canvas.getContext('2d');
            canvas.height = viewport.height;
            canvas.width = viewport.width;
            if (context) {
                await page.render({ canvasContext: context, viewport, canvas }).promise;
                const { data: { text } } = await worker.recognize(canvas);
                fullText += text + '\n';
            }
        }
    } finally {
        await worker.terminate();
    }
    return fullText;
  };

  const downloadResult = (file: FileProgress) => {
    if (!file.result) return;
    const blob = new Blob([file.result], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `manifesto_${file.name.replace('.pdf', '')}_extracted.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const downloadAll = () => {
    const doneFiles = files.filter(f => f.status === 'done' && f.result);
    if (doneFiles.length === 0) return;
    const combined = doneFiles.map(f => `FILE: ${f.name}\n${'='.repeat(20)}\n${f.result}\n\n`).join('\n');
    const blob = new Blob([combined], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `all_manifests_extracted.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return createPortal(
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[9999] flex items-center justify-center p-4 animate-in fade-in duration-300 font-sans">
      <div className="bg-header border border-subtle rounded-[2.5rem] w-full max-w-4xl shadow-high relative flex flex-col max-h-[90vh] overflow-hidden animate-in zoom-in-95 duration-200 glass">
        {/* Top Accent Line */}
        <div className="absolute top-0 left-0 w-full h-1.5 bg-gradient-to-r from-brand-primary via-indigo-500 to-brand-primary z-50" />
        
        {/* Header Section (Fixed) */}
        <div className="px-8 pt-8 pb-6 border-b border-subtle shrink-0">
            <button onClick={onClose} className="absolute top-7 right-8 text-muted hover:text-primary p-2 hover:bg-main rounded-full transition-all">
                <X className="w-6 h-6" />
            </button>
            <div className="flex flex-col gap-1.5">
                <h2 className="text-2xl font-black text-primary tracking-tighter uppercase leading-none">Advanced OCR Hub</h2>
                <p className="text-[9px] font-black text-muted uppercase tracking-[0.4em] opacity-80">AI-Powered Manifest Extraction</p>
            </div>
        </div>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto no-scrollbar p-8">
            <div className="flex flex-col gap-6">
                {files.length === 0 && (
                    <div 
                        onClick={() => fileInputRef.current?.click()}
                        className="flex-1 border-4 border-dashed border-subtle/50 rounded-[2.5rem] flex flex-col items-center justify-center py-16 gap-6 hover:border-brand-primary/50 hover:bg-brand-primary/5 transition-all cursor-pointer group"
                    >
                        <div className="p-8 bg-brand-primary/10 rounded-full text-brand-primary group-hover:scale-110 transition-transform shadow-low border border-brand-primary/20">
                            <UploadCloud className="w-12 h-12" />
                        </div>
                        <div className="text-center">
                            <p className="text-xl font-extrabold text-primary uppercase tracking-tight">Select Manifests Source</p>
                            <p className="text-[10px] text-muted font-bold uppercase tracking-[0.3em] mt-3 opacity-60">Click to browse or drag PDF files here</p>
                        </div>
                        <input type="file" multiple accept="application/pdf" className="hidden" ref={fileInputRef} onChange={handleFileSelect} />
                    </div>
                )}

                {files.length > 0 && (
                    <div className="space-y-3">
                        {files.map((file, idx) => (
                            <div key={idx} className="glass border border-subtle rounded-3xl p-5 flex items-center gap-5 group transition-all hover:border-brand-primary/50 hover:shadow-medium">
                                <div className="p-3.5 bg-header rounded-2xl shadow-low border border-subtle group-hover:scale-110 transition-transform">
                                    <FileText className="w-6 h-6 text-brand-primary" />
                                </div>
                                <div className="flex-1 min-w-0">
                                    <div className="flex justify-between items-start mb-2">
                                        <h4 className="text-xs font-extra-bold text-primary truncate pr-4">{file.name}</h4>
                                        <span className={cn(
                                            "text-[9px] font-black uppercase tracking-widest px-3 py-1 rounded-full shadow-low",
                                            file.status === 'done' ? "text-white bg-status-success" :
                                            file.status === 'processing' ? "text-white bg-brand-primary animate-pulse" :
                                            file.status === 'error' ? "text-white bg-status-error" :
                                            "text-muted bg-sidebar border border-subtle"
                                        )}>
                                            {file.status}
                                        </span>
                                    </div>
                                    <div className="w-full bg-sidebar rounded-full h-2 overflow-hidden border border-subtle shadow-inner">
                                        <div 
                                            className={cn(
                                                "h-full transition-all duration-500 ease-out",
                                                file.status === 'error' ? "bg-status-error" : "bg-gradient-to-r from-brand-primary to-indigo-400"
                                            )}
                                            style={{ width: `${file.progress}%` }}
                                        />
                                    </div>
                                    {file.error && <p className="text-[9px] font-bold text-status-error mt-2.5 flex items-center gap-1.5"><AlertCircle size={10}/> {file.error}</p>}
                                </div>
                                {file.status === 'done' && (
                                    <button 
                                        onClick={() => downloadResult(file)}
                                        className="p-2.5 text-brand-primary hover:bg-brand-primary/10 rounded-xl transition-all"
                                        title="Download TXT"
                                    >
                                        <Download className="w-5 h-5" />
                                    </button>
                                )}
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>

        {/* Footer Section (Fixed) */}
        <div className="p-8 border-t border-subtle bg-sidebar/20 shrink-0">
            <div className="flex gap-4 mb-6">
                <button 
                    onClick={() => { setFiles([]); setIsProcessing(false); }}
                    className="flex-1 py-4 text-[10px] font-black text-muted uppercase tracking-[0.2em] hover:text-primary transition-all underline-offset-8 hover:underline"
                    disabled={isProcessing}
                >
                    Clear List
                </button>
                {files.some(f => f.status === 'pending') ? (
                    <button 
                        onClick={processFiles}
                        disabled={isProcessing}
                        className="flex-[2] py-4 bg-brand-primary text-white rounded-xl text-[10px] font-black uppercase tracking-[0.2em] shadow-high shadow-brand-primary/10 hover:brightness-110 active:scale-95 transition-all flex items-center justify-center gap-3"
                    >
                        {isProcessing ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
                        {isProcessing ? 'Processing Agent...' : 'Start Intelligent OCR'}
                    </button>
                ) : files.some(f => f.status === 'done') ? (
                    <button 
                        onClick={downloadAll}
                        className="flex-[2] py-4 bg-gradient-to-br from-emerald-500 to-emerald-600 text-white rounded-xl text-[10px] font-black uppercase tracking-[0.2em] shadow-high shadow-emerald-500/10 hover:brightness-110 active:scale-95 transition-all flex items-center justify-center gap-3"
                    >
                        <Download className="w-4 h-4" /> Export Bulk Data
                    </button>
                ) : (
                    <button 
                        onClick={() => fileInputRef.current?.click()}
                        className="flex-[2] py-4 bg-header border border-subtle text-primary rounded-xl text-[10px] font-black uppercase tracking-[0.2em] hover:bg-main transition-all"
                    >
                        Queue More Manifests
                    </button>
                )}
            </div>
            
            <div className="flex items-center gap-3 text-muted">
                <AlertCircle size={12} className="shrink-0" />
                <p className="text-[9px] font-bold leading-relaxed uppercase tracking-wider opacity-60">
                    Security Advice: Processing is handled locally. Data never leaves your secure session.
                </p>
            </div>
        </div>
      </div>
    </div>,
    document.body
  );
}

function cn(...classes: (string | boolean | undefined)[]) {
  return classes.filter(Boolean).join(' ');
}
