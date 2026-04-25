/**
 * Utilitário central para carregar o motor PDF.js v2.16.105 localmente.
 * Esta abordagem é imune a bloqueios de CDN, CSP e erros de inicialização de worker.
 */

const PDFJS_URL = '/pdf.min.js';
const PDFJS_WORKER_URL = '/pdf.worker.min.js';

export async function loadPdfJs(): Promise<any> {
    if ((window as any).pdfjsLib) return (window as any).pdfjsLib;

    return new Promise((resolve, reject) => {
        const script = document.createElement('script');
        script.src = window.location.origin + PDFJS_URL;
        script.onload = () => {
            const pdfjsLib = (window as any).pdfjsLib;
            // Configura o worker localmente
            pdfjsLib.GlobalWorkerOptions.workerSrc = window.location.origin + PDFJS_WORKER_URL;
            resolve(pdfjsLib);
        };
        script.onerror = () => reject(new Error('Falha ao carregar motor PDF local (v2.16.105)'));
        document.head.appendChild(script);
    });
}
