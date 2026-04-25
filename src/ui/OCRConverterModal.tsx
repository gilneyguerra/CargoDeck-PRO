import React, { useState, useRef } from 'react';
import { X, UploadCloud, FileText, CheckCircle2, Loader2, Download, AlertCircle } from 'lucide-react';
import { createWorker } from 'tesseract.js';
import * as pdfjs from 'pdfjs-dist';

// pdfjs worker setup
pdfjs.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjs.version}/pdf.worker.min.mjs`;

interface FileProgress {
  name: string;
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

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
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
        // @ts-ignore - access the stored file from initial selection
        const fileObj = currentFile.file as File;

        setFiles(prev => prev.map((f, idx) => idx === i ? { ...f, status: 'processing' } : f));

        try {
            const text = await performOCR(fileObj, (p) => {
                setFiles(prev => prev.map((f, idx) => idx === i ? { ...f, progress: Math.round(p * 100) } : f));
            });

            setFiles(prev => prev.map((f, idx) => idx === i ? { ...f, status: 'done', result: text, progress: 100 } : f));
        } catch (err: any) {
            setFiles(prev => prev.map((f, idx) => idx === i ? { ...f, status: 'error', error: err.message } : f));
        }
    }
    
    setIsProcessing(false);
  };

  const performOCR = async (file: File, onProgress: (p: number) => void): Promise<string> => {
    const arrayBuffer = await file.arrayBuffer();
    const pdf = await pdfjs.getDocument({ data: arrayBuffer }).promise;
    let fullText = '';

    const worker = await createWorker('por', 1, {
        logger: m => {
            if (m.status === 'recognizing text') onProgress(m.progress);
        }
    });

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

    await worker.terminate();
    return fullText;
  };

  const downloadResult = (file: FileProgress) => {
    if (!file.result) return;
    const blob = new Blob([file.result], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = file.name.replace('.pdf', '_OCR.txt');
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const downloadAll = () => {
      files.filter(f => f.status === 'done').forEach(downloadResult);
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in duration-300">
      <div className="bg-header border border-subtle rounded-[2.5rem] p-10 w-full max-w-3xl shadow-2xl relative max-h-[90vh] flex flex-col animate-in zoom-in-95 duration-200">
        <button onClick={onClose} className="absolute top-6 right-6 p-2 text-muted hover:text-primary hover:bg-sidebar rounded-full transition-all">
          <X className="w-6 h-6" />
        </button>

        <div className="mb-8">
            <h2 className="text-2xl font-black text-primary tracking-tight">Conversor OCR</h2>
            <p className="text-xs text-muted font-bold uppercase tracking-widest mt-1">Digitalização de Manifestos Escaneados</p>
        </div>

        <div className="flex-1 overflow-hidden flex flex-col gap-6">
            {!isProcessing && files.length === 0 && (
                <div 
                    onClick={() => fileInputRef.current?.click()}
                    className="flex-1 border-4 border-dashed border-subtle rounded-[2rem] flex flex-col items-center justify-center gap-4 hover:border-brand-primary/50 hover:bg-brand-primary/5 transition-all cursor-pointer group"
                >
                    <div className="p-6 bg-brand-primary/10 rounded-[2rem] group-hover:scale-110 transition-transform">
                        <UploadCloud className="w-12 h-12 text-brand-primary" />
                    </div>
                    <div className="text-center">
                        <p className="text-lg font-black text-primary">Selecione seus arquivos PDF</p>
                        <p className="text-sm text-muted font-bold uppercase tracking-wider mt-1">Clique para procurar ou arraste aqui</p>
                    </div>
                    <input type="file" multiple accept="application/pdf" className="hidden" ref={fileInputRef} onChange={handleFileSelect} />
                </div>
            )}

            {files.length > 0 && (
                <div className="flex-1 overflow-auto space-y-3 pr-2 scroll-smooth no-scrollbar">
                    {files.map((file, idx) => (
                        <div key={idx} className="bg-main border border-subtle rounded-3xl p-5 flex items-center gap-4 group">
                            <div className="p-3 bg-header rounded-2xl shadow-sm border border-subtle">
                                <FileText className="w-6 h-6 text-brand-primary" />
                            </div>
                            <div className="flex-1 min-w-0">
                                <div className="flex justify-between items-start mb-1">
                                    <h4 className="text-sm font-black text-primary truncate pr-4">{file.name}</h4>
                                    <span className={cn(
                                        "text-[10px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full",
                                        file.status === 'done' ? "text-status-success bg-status-success/10" :
                                        file.status === 'processing' ? "text-brand-primary bg-brand-primary/10" :
                                        file.status === 'error' ? "text-status-error bg-status-error/10" :
                                        "text-muted bg-sidebar"
                                    )}>
                                        {file.status}
                                    </span>
                                </div>
                                <div className="w-full bg-sidebar/50 rounded-full h-2 overflow-hidden border border-subtle/50">
                                    <div 
                                        className={cn(
                                            "h-full transition-all duration-300",
                                            file.status === 'error' ? "bg-status-error" : "bg-brand-primary"
                                        )}
                                        style={{ width: `${file.progress}%` }}
                                    />
                                </div>
                                {file.error && <p className="text-[10px] font-bold text-status-error mt-2">{file.error}</p>}
                            </div>
                            {file.status === 'done' && (
                                <button 
                                    onClick={() => downloadResult(file)}
                                    className="p-3 text-brand-primary hover:bg-brand-primary/10 rounded-2xl transition-all"
                                    title="Download TXT"
                                >
                                    <Download className="w-5 h-5" />
                                </button>
                            )}
                        </div>
                    ))}
                </div>
            )}

            <div className="flex gap-4">
                <button 
                    onClick={() => {
                        setFiles([]);
                        setIsProcessing(false);
                    }}
                    className="flex-1 py-4 border-2 border-subtle rounded-3xl text-[10px] font-black text-muted uppercase tracking-widest hover:border-strong transition-all"
                    disabled={isProcessing}
                >
                    Limpar Lista
                </button>
                {files.some(f => f.status === 'pending') ? (
                    <button 
                        onClick={processFiles}
                        disabled={isProcessing}
                        className="flex-[2] py-4 bg-brand-primary text-white rounded-3xl text-[10px] font-black uppercase tracking-[0.2em] shadow-xl shadow-brand-primary/20 hover:brightness-110 active:scale-[0.98] transition-all flex items-center justify-center gap-3"
                    >
                        {isProcessing ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
                        {isProcessing ? 'PROCESSANDO...' : 'INICIAR CONVERSÃO OCR'}
                    </button>
                ) : files.some(f => f.status === 'done') ? (
                    <button 
                        onClick={downloadAll}
                        className="flex-[2] py-4 bg-status-success text-white rounded-3xl text-[10px] font-black uppercase tracking-[0.2em] shadow-xl shadow-status-success/20 hover:brightness-110 active:scale-[0.98] transition-all flex items-center justify-center gap-3"
                    >
                        <Download className="w-4 h-4" />
                        BAIXAR TODOS OS TXTs
                    </button>
                ) : (
                    <button 
                        onClick={() => fileInputRef.current?.click()}
                        className="flex-[2] py-4 bg-brand-primary text-white rounded-3xl text-[10px] font-black uppercase tracking-[0.2em] shadow-xl shadow-brand-primary/20 hover:brightness-110 active:scale-[0.98] transition-all"
                    >
                        ADICIONAR MAIS ARQUIVOS
                    </button>
                )}
            </div>
        </div>

        <div className="mt-8 pt-6 border-t border-subtle flex items-center gap-3 text-muted">
            <AlertCircle size={14} className="shrink-0" />
            <p className="text-[10px] font-bold leading-relaxed uppercase tracking-wider">
                Atenção: A conversão OCR é realizada localmente no seu navegador. Arquivos grandes podem levar alguns minutos.
            </p>
        </div>
      </div>
    </div>
  );
}

function cn(...classes: (string | boolean | undefined)[]) {
  return classes.filter(Boolean).join(' ');
}
