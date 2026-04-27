/**
 * @file Serviço de Pré-processamento de Imagens utilizando OpenCV.js (WASM).
 * Implementa pipeline AVA (Advanced Vision Analysis): Denoising, Binarização Adaptativa e Deskew.
 */
import { logger } from '../utils/logger';

interface CvMat { delete(): void; clone(): CvMat; cols: number; size(): { width: number; height: number }; }
declare const cv: { 
    imread(c: HTMLCanvasElement): CvMat; 
    Mat: new () => CvMat;
    cvtColor(s: CvMat, d: CvMat, c: number, x: number): void;
    bilateralFilter(s: CvMat, d: CvMat, d2: number, sc: number, ss: number, b: number): void;
    adaptiveThreshold(s: CvMat, d: CvMat, m: number, a: number, t: number, b: number, c: number): void;
    moments(s: CvMat, b: boolean): { mu02: number; mu11: number };
    matFromArray(r: number, c: number, t: number, d: number[]): CvMat;
    warpAffine(s: CvMat, d: CvMat, m: CvMat, sz: any, i: number, b: number, sc: any): void;
    Scalar: new (r: number, g: number, b: number, a: number) => any;
    imshow(c: HTMLCanvasElement, s: CvMat): void;
    COLOR_RGBA2GRAY: number; BORDER_DEFAULT: number; ADAPTIVE_THRESH_GAUSSIAN_C: number; THRESH_BINARY: number; CV_32F: number; INTER_LINEAR: number; BORDER_CONSTANT: number;
};

class ImagePreprocessor {
    private isLoaded = false;
    private loadPromise: Promise<void> | null = null;

    /**
     * Carrega o OpenCV.js dinamicamente via CDN.
     */
    async load(): Promise<void> {
        if (this.isLoaded) return;
        if (this.loadPromise) return this.loadPromise;

        this.loadPromise = new Promise((resolve, reject) => {
            if (typeof cv !== 'undefined' && cv.runtimeInitialized) {
                this.isLoaded = true;
                resolve();
                return;
            }

            const script = document.createElement('script');
            script.src = 'https://docs.opencv.org/4.10.0/opencv.js';
            script.async = true;
            script.onload = () => {
                // OpenCV.js carregar não significa que o WASM foi inicializado
                const checkCv = () => {
                    if (typeof cv !== 'undefined' && cv.Mat) {
                        this.isLoaded = true;
                        logger.info('OpenCV.js (WASM) inicializado com sucesso.');
                        resolve();
                    } else {
                        setTimeout(checkCv, 100);
                    }
                };
                checkCv();
            };
            script.onerror = () => {
                this.loadPromise = null;
                reject(new Error('Falha ao carregar OpenCV.js via CDN.'));
            };
            document.body.appendChild(script);
        });

        return this.loadPromise;
    }

    /**
     * Executa o pipeline AVA completo em uma imagem (Canvas).
     */
    async preprocess(canvas: HTMLCanvasElement): Promise<HTMLCanvasElement> {
        await this.load();

        try {
            const src = cv.imread(canvas);
            const dst = new cv.Mat();
            
            // 1. Grayscale
            cv.cvtColor(src, dst, cv.COLOR_RGBA2GRAY, 0);

            // 2. Denoising (Bilateral Filter)
            const denoised = new cv.Mat();
            cv.bilateralFilter(dst, denoised, 9, 75, 75, cv.BORDER_DEFAULT);

            // 3. Adaptive Thresholding (Binarização Adaptativa)
            const binary = new cv.Mat();
            cv.adaptiveThreshold(
                denoised, 
                binary, 
                255, 
                cv.ADAPTIVE_THRESH_GAUSSIAN_C, 
                cv.THRESH_BINARY, 
                11, 
                2
            );

            // 4. Deskew (Correção de Inclinação) sutil
            const final = this.deskew(binary);

            // Renderiza de volta no canvas
            const outputCanvas = document.createElement('canvas');
            cv.imshow(outputCanvas, final);

            // Cleanup
            src.delete(); dst.delete(); denoised.delete(); binary.delete(); final.delete();

            return outputCanvas;
        } catch (err) {
            logger.error('Erro no pré-processamento OpenCV', err instanceof Error ? err : undefined);
            return canvas; // Fallback para imagem original se falhar
        }
    }

    /**
     * Algoritmo de correção de inclinação baseado em momentos de imagem.
     */
    private deskew(src: CvMat): CvMat {
        try {
            const moments = cv.moments(src, true);
            if (Math.abs(moments.mu02) < 0.01) return src.clone();
            
            const skew = moments.mu11 / moments.mu02;
            if (Math.abs(skew) < 0.01) return src.clone();

            const M = cv.matFromArray(2, 3, cv.CV_32F, [1, skew, -0.5 * src.cols * skew, 0, 1, 0]);
            const dst = new cv.Mat();
            cv.warpAffine(src, dst, M, src.size(), cv.INTER_LINEAR, cv.BORDER_CONSTANT, new cv.Scalar(255, 255, 255, 255));
            M.delete();
            return dst;
        } catch {
            return src.clone();
        }
    }
}

export const imagePreprocessor = new ImagePreprocessor();
