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

export function CargoPreview({ format, length, width, height, color, scale = 50, quantity = 1, weightTonnes = 0, dynamicScale = false, cargo }: CargoPreviewProps) {
    // Use consistent scaling if cargo object is provided with required dimensions
    if (cargo && 
        cargo.lengthMeters !== undefined && 
        cargo.widthMeters !== undefined && 
        (cargo.heightMeters !== undefined || cargo.heightMeters === 0)) {
      const { width: scaledWidth, height: scaledHeight, length: scaledLength } = getScaledDimensions(cargo as Cargo);
      
      // Adjust for quantity
      const spacing = 5; // pixels between shapes
      const totalWidth = Math.min(quantity * (scaledWidth + spacing) - spacing + 20, 150);
      const totalHeight = Math.min(Math.max(scaledHeight, scaledLength) + 20, 60);
      
      return (
        <svg width={Math.round(totalWidth)} height={Math.round(totalHeight)} className="border border-neutral-600">
          {Array.from({ length: quantity }).map((_, i) => {
            const xOffset = i * (scaledWidth + spacing) + 10;
            if (format === 'Tubular') {
              return (
                <g key={i} transform={`translate(${xOffset}, 0)`}>
                  <ellipse cx={scaledWidth / 2} cy={10} rx={scaledWidth / 2} ry={5} fill={color} fillOpacity={0.3} stroke={color} />
                  <rect x={0} y={10} width={scaledWidth} height={scaledLength - 10} fill={color} fillOpacity={0.3} stroke={color} />
                  <ellipse cx={scaledWidth / 2} cy={scaledLength + 5} rx={scaledWidth / 2} ry={5} fill={color} fillOpacity={0.3} stroke={color} />
                </g>
              );
            } else {
              return (
                <rect key={i} x={xOffset} y={10} width={scaledWidth} height={scaledHeight} fill={color} fillOpacity={0.3} stroke={color} />
              );
            }
          })}
          <text x={totalWidth / 2} y={totalHeight - 5} textAnchor="middle" fill="white" fontSize="8">
            {quantity > 1 ? `${quantity} unid x ${weightTonnes.toFixed(1)} ton` : `${quantity} unid x ${weightTonnes.toFixed(1)} ton`}
          </text>
        </svg>
      );
    }
    
    // Fallback to original scaling logic
    const maxDim = 150; // max preview size
    let effectiveScale = scale;
    if (dynamicScale) {
      const maxSize = 80; // max pixels for largest dimension
      const maxCargoDim = Math.max(length, width, height);
      effectiveScale = maxCargoDim > 0 ? maxSize / maxCargoDim : scale;
      effectiveScale = Math.max(effectiveScale, 0.5); // min scale
    }
    const maxShown = quantity; // Show exact quantity
    const shownQuantity = maxShown;
    const spacing = 5; // pixels between shapes

    // Calculate adjusted scale to fit all shapes within maxDim
    const effectiveWidth = format === 'Quadrado' ? length : width;
    const baseScale = effectiveScale;
    const scaledWidthTemp = Math.min(effectiveWidth * baseScale, maxDim);
    const requiredWidth = shownQuantity * (scaledWidthTemp + spacing) - spacing + 20;
    const adjustedScale = requiredWidth > maxDim ? (maxDim - 20 - (shownQuantity - 1) * spacing) / (shownQuantity * effectiveWidth) : baseScale;
    const finalScale = Math.max(adjustedScale, 0.5); // Min scale 0.5

    const scaledLength = Math.min(length * finalScale, maxDim);
    const scaledWidth = Math.min((format === 'Quadrado' ? length : width) * finalScale, maxDim);
    const scaledHeight = Math.min(height * finalScale, maxDim);

    const totalWidth = Math.min(shownQuantity * (scaledWidth + spacing) - spacing + 20, 150);
    const totalHeight = Math.min(Math.max(scaledHeight, scaledLength) + 20, 60);

   const shapes = [];
   for (let i = 0; i < shownQuantity; i++) {
     const xOffset = i * (scaledWidth + spacing) + 10;
     if (format === 'Tubular') {
       shapes.push(
         <g key={i} transform={`translate(${xOffset}, 0)`}>
           <ellipse cx={scaledWidth / 2} cy={10} rx={scaledWidth / 2} ry={5} fill={color} fillOpacity={0.3} stroke={color} />
           <rect x={0} y={10} width={scaledWidth} height={scaledLength - 10} fill={color} fillOpacity={0.3} stroke={color} />
           <ellipse cx={scaledWidth / 2} cy={scaledLength + 5} rx={scaledWidth / 2} ry={5} fill={color} fillOpacity={0.3} stroke={color} />
         </g>
       );
     } else {
       shapes.push(
         <rect key={i} x={xOffset} y={10} width={scaledWidth} height={scaledHeight} fill={color} fillOpacity={0.3} stroke={color} />
       );
     }
   }

   if (format === 'Tubular') {
     return (
       <svg width={Math.round(totalWidth)} height={Math.round(totalHeight)} className="border border-neutral-600">
         {shapes}
       <text x={totalWidth / 2} y={totalHeight - 5} textAnchor="middle" fill="white" fontSize="8">
         {quantity > shownQuantity ? `${shownQuantity}+ unid x ${weightTonnes.toFixed(1)} ton` : `${quantity} unid x ${weightTonnes.toFixed(1)} ton`}
       </text>
       </svg>
     );
   }

   return (
     <svg width={Math.round(totalWidth)} height={Math.round(totalHeight)} className="border border-neutral-600">
       {shapes}
       <text x={totalWidth / 2} y={totalHeight - 5} textAnchor="middle" fill="white" fontSize="8">
         {quantity > shownQuantity ? `${shownQuantity}+ unid x ${weightTonnes.toFixed(1)} ton` : `${quantity} unid x ${weightTonnes.toFixed(1)} ton`}
       </text>
     </svg>
   );
}