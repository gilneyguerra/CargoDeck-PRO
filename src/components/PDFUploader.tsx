// src/components/PDFUploader.tsx
/**
 * @file Componente de UI para upload de arquivos PDF com feedback visual.
 * Utiliza o hook `usePDFUpload` para gerenciar a lógica de upload e extração.
 */
import React, { useRef } from 'react';
import { usePDFUpload } from '../hooks/usePDFUpload';
import { useCargoStore } from '../features/cargoStore'; // Ajuste o caminho se necessário
import { Upload, AlertCircle, CheckCircle, Loader, FileText } from 'lucide-react';
import { logger } from '../utils/logger';

export function PDFUploader() {
    const fileInputRef = useRef<HTMLInputElement>(null);
    const { loading, error, progress, success, fileName, upload, reset } = usePDFUpload();
    const addCargas = useCargoStore(state => state.addCargas);

    const handleFileSelect = async (file: File) => {
        logger.info(`Arquivo selecionado: ${file.name}`);
        reset(); // Limpa qualquer estado de upload anterior
        const extractedItems = await upload(file);

        if (extractedItems) {
            addCargas(extractedItems);
            logger.info(`Itens de carga adicionados ao store: ${extractedItems.length}`);
        }
    };

    const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
        e.preventDefault();
        e.stopPropagation(); // Previne o comportamento padrão do navegador
        const file = e.dataTransfer.files[0];
        if (file) {
            handleFileSelect(file);
        } else {
            logger.warn('Nenhum arquivo encontrado no evento de drop.');
        }
    };

    const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
        e.preventDefault();
        e.stopPropagation();
    };

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.currentTarget.files?.[0];
        if (file) {
            handleFileSelect(file);
        }
        // Limpa o input para permitir o upload do mesmo arquivo novamente
        if (fileInputRef.current) {
            fileInputRef.current.value = '';
        }
    };

    const renderContent = () => {
        if (loading) {
            return (
                <div className="flex flex-col items-center gap-4">
                    <Loader className="w-10 h-10 animate-spin text-blue-500" />
                    <div className="w-full bg-gray-200 rounded-full h-2">
                        <div
                            className="bg-blue-500 h-2 rounded-full transition-all duration-300 ease-out"
                            style={{ width: `${progress}%` }}
                        />
                    </div>
                    <p className="text-sm text-gray-600">Processando {fileName ? `"${fileName}"` : 'arquivo'}... {progress}%</p>
                </div>
            );
        }

        if (error) {
            return (
                <div className="flex flex-col items-center gap-2">
                    <AlertCircle className="w-10 h-10 text-red-500" />
                    <p className="text-red-600 font-semibold text-center">{error.message}</p>
                    <p className="text-sm text-gray-500">Código: {error.code}</p>
                    <button
                        onClick={() => fileInputRef.current?.click()}
                        className="mt-4 px-6 py-3 bg-red-600 text-white rounded-lg shadow-md hover:bg-red-700 transition-colors"
                    >
                        Tentar Novamente
                    </button>
                </div>
            );
        }

        if (success) {
            return (
                <div className="flex flex-col items-center gap-2">
                    <CheckCircle className="w-10 h-10 text-green-500" />
                    <p className="text-green-600 font-semibold text-center">
                        "{fileName}" processado com sucesso!
                    </p>
                    <button
                        onClick={() => {
                            reset();
                            fileInputRef.current?.click();
                        }}
                        className="mt-4 px-6 py-3 bg-green-600 text-white rounded-lg shadow-md hover:bg-green-700 transition-colors"
                    >
                        Carregar Outro PDF
                    </button>
                </div>
            );
        }

        return (
            <div className="flex flex-col items-center gap-4">
                <FileText className="w-12 h-12 text-gray-400" />
                <p className="text-gray-600 text-lg font-medium">
                    Arraste e solte seu PDF aqui
                </p>
                <p className="text-gray-500 text-sm">ou</p>
                <button
                    onClick={() => fileInputRef.current?.click()}
                    className="px-6 py-3 bg-blue-600 text-white rounded-lg shadow-md hover:bg-blue-700 transition-colors"
                >
                    Selecionar Arquivo PDF
                </button>
                <p className="text-xs text-gray-400 mt-2">
                    Apenas arquivos .pdf são aceitos (máx. 50MB)
                </p>
            </div>
        );
    };

    return (
        <div
            onDrop={handleDrop}
            onDragOver={handleDragOver}
            className={`border-2 border-dashed rounded-xl p-8 text-center transition-all duration-200 ease-in-out
            ${loading ? 'border-blue-400 bg-blue-50' : ''}
            ${error ? 'border-red-400 bg-red-50' : ''}
            ${success ? 'border-green-400 bg-green-50' : ''}
            ${!loading && !error && !success ? 'border-gray-300 hover:border-blue-500 hover:bg-gray-50' : ''}`}
            style={{ minHeight: '200px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
        >
        <input
            ref={fileInputRef}
            type="file"
            accept="application/pdf"
            onChange={handleInputChange}
            className="hidden"
        />
        {renderContent()}
    </div>
}