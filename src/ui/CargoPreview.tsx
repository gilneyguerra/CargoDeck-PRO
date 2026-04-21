import React from 'react';
import { getScaledDimensions } from '@/lib/scaling';
import type { Cargo } from '@/domain/Cargo';

interface CargoPreviewProps {
  format: 'Retangular' | 'Quadrado' | 'Tubular';
  length: number;
  width: number;
  height: number;
  color: string;
  scale?: number;
  quantity?: number;
  weightTonnes?: number;
  dynamicScale?: boolean; // If true, adjust scale to fit largest dimension in 80px
   cargo?: Partial<Cargo>; // Optional cargo object for consistent scaling
}

export function CargoPreview({ format, length, width, height, color, quantity = 1, cargo }: CargoPreviewProps) {
    
    // Fallback pra criar dummy object caso cargo prop doesn't exist
    const mockCargo = cargo || {
        lengthMeters: length,
        widthMeters: width,
        heightMeters: height,
    };
    
    const { width: scaledWidth, height: scaledHeight, length: scaledLength } = getScaledDimensions(mockCargo as Cargo);

    const actualDrawWidth = format === 'Quadrado' ? scaledLength : scaledWidth;

    const spacing = 2; // pixels between grouped units
    const totalWidth = quantity * (actualDrawWidth + spacing) - spacing;
    const totalHeight = format === 'Tubular' ? scaledLength : scaledHeight;

    const shapes: React.ReactNode[] = [];
    for (let i = 0; i < quantity; i++) {
        const xOffset = i * (actualDrawWidth + spacing);
        if (format === 'Tubular') {
            shapes.push(
                <g key={i} transform={`translate(${xOffset}, 0)`}>
                    <rect x={0} y={0} width={actualDrawWidth} height={scaledLength} fill={color} fillOpacity={0.8} />
                    <line x1={actualDrawWidth / 2} y1={0} x2={actualDrawWidth / 2} y2={scaledLength} stroke="#111" strokeWidth={1} opacity={0.3} />
                </g>
            );
        } else {
            shapes.push(
                <rect key={i} x={xOffset} y={0} width={actualDrawWidth} height={scaledHeight} fill={color} fillOpacity={0.8} stroke="#111" strokeWidth={1} />
            );
        }
    }

    return (
        <svg width={totalWidth} height={totalHeight} className="overflow-hidden">
            {shapes}
        </svg>
    );
}