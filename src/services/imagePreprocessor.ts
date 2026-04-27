/**
 * @file Serviço de Pré-processamento de Imagens utilizando OpenCV.js (WASM).
 * Implementa pipeline AVA (Advanced Vision Analysis): Denoising, Binarização Adaptativa e Deskew.
 */
import { logger } from '../utils/logger';

declare const cv: any;

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
    private deskew(src: any): any {
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
