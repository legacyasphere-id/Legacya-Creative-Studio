import React, { useEffect, useRef, useState } from 'react';
import { FigmaSlideElement, SlideSpecification } from '../types/studio';

interface SlideCanvasPreviewProps {
  spec: SlideSpecification;
  showWireframeIds?: boolean;
  selectedLayerId?: string | null;
  onSelectLayer?: (layerId: string) => void;
  className?: string;
}

export const SlideCanvasPreview: React.FC<SlideCanvasPreviewProps> = ({
  spec,
  showWireframeIds = false,
  selectedLayerId = null,
  onSelectLayer,
  className = '',
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(0.28);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const updateScale = () => {
      const rect = el.getBoundingClientRect();
      if (rect.width > 0) {
        setScale(rect.width / spec.width);
      }
    };

    updateScale();
    const observer = new ResizeObserver(updateScale);
    observer.observe(el);
    return () => observer.disconnect();
  }, [spec.width]);

  const orderedElements = [...spec.elements].sort((a, b) => a.layerOrder - b.layerOrder);

  const renderElement = (el: FigmaSlideElement) => {
    const isSelected = selectedLayerId === el.id;
    const baseStyle: React.CSSProperties = {
      position: 'absolute',
      left: `${el.x}px`,
      top: `${el.y}px`,
      width: `${el.width}px`,
      height: `${Math.max(2, el.height)}px`,
      opacity: el.opacity,
      zIndex: el.layerOrder,
      boxSizing: 'border-box',
      outline: isSelected
        ? '3px solid #B45309'
        : showWireframeIds
        ? '1px dashed rgba(180, 83, 9, 0.55)'
        : 'none',
      cursor: onSelectLayer ? 'pointer' : 'default',
    };

    const handleClick = (e: React.MouseEvent) => {
      if (onSelectLayer) {
        e.stopPropagation();
        onSelectLayer(el.id);
      }
    };

    if (el.type === 'TEXT') {
      return (
        <div
          key={el.id}
          style={{
            ...baseStyle,
            fontFamily: `"${el.fontFamily}", ${el.fallbackFontFamily}`,
            fontSize: `${el.fontSize}px`,
            fontWeight: el.fontWeight,
            lineHeight: el.lineHeight,
            letterSpacing: `${el.letterSpacing}em`,
            textAlign: el.textAlign.toLowerCase() as 'left' | 'center' | 'right',
            color: el.textColor,
            whiteSpace: 'pre-wrap',
            overflow: 'hidden',
            wordBreak: 'break-word',
          }}
          onClick={handleClick}
          title={`${el.name} (${el.id})`}
        >
          {el.textContent}
          {showWireframeIds && (
            <span
              style={{
                position: 'absolute',
                top: 0,
                right: 0,
                backgroundColor: '#121212',
                color: '#F7F4EE',
                fontSize: '13px',
                fontFamily: 'JetBrains Mono, monospace',
                padding: '2px 6px',
                lineHeight: 1.1,
                pointerEvents: 'none',
              }}
            >
              {el.id}
            </span>
          )}
        </div>
      );
    }

    if (el.type === 'RECTANGLE') {
      return (
        <div
          key={el.id}
          style={{
            ...baseStyle,
            backgroundColor: el.fill || 'transparent',
            border: el.stroke ? `${el.strokeWidth || 1}px solid ${el.stroke}` : 'none',
            borderRadius: el.cornerRadius ? `${el.cornerRadius}px` : '0px',
          }}
          onClick={handleClick}
          title={`${el.name} (${el.id})`}
        />
      );
    }

    if (el.type === 'ELLIPSE') {
      return (
        <div
          key={el.id}
          style={{
            ...baseStyle,
            backgroundColor: el.fill || 'transparent',
            border: el.stroke ? `${el.strokeWidth || 1.5}px solid ${el.stroke}` : 'none',
            borderRadius: '9999px',
          }}
          onClick={handleClick}
          title={`${el.name} (${el.id})`}
        />
      );
    }

    if (el.type === 'LINE') {
      return (
        <div
          key={el.id}
          style={{
            ...baseStyle,
            height: `${Math.max(1, el.strokeWidth || 1)}px`,
            backgroundColor: el.stroke || el.fill || '#D8D2C5',
          }}
          onClick={handleClick}
          title={`${el.name} (${el.id})`}
        />
      );
    }

    if (el.type === 'VECTOR') {
      return (
        <svg
          key={el.id}
          style={baseStyle}
          viewBox={`0 0 ${el.width} ${el.height}`}
          onClick={handleClick}
        >
          <title>{`${el.name} (${el.id})`}</title>
          <path
            d={el.vectorSvgPath || `M 0 ${el.height} L ${el.width} 0`}
            stroke={el.stroke || '#D8D2C5'}
            strokeWidth={el.strokeWidth || 1.5}
            fill={el.fill || 'none'}
          />
        </svg>
      );
    }

    if (el.type === 'IMAGE') {
      const hasDataImage =
        el.imageReference &&
        (el.imageReference.startsWith('data:image/') || el.imageReference.startsWith('/'));
      return (
        <div
          key={el.id}
          style={{
            ...baseStyle,
            overflow: 'hidden',
            backgroundColor: '#E5DFD3',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
          onClick={handleClick}
          title={`${el.name} (${el.id})`}
        >
          {hasDataImage ? (
            <img
              src={el.imageReference}
              alt={el.altText}
              referrerPolicy="no-referrer"
              style={{
                width: '100%',
                height: '100%',
                objectFit: el.fitMode === 'FIT' ? 'contain' : 'cover',
                display: 'block',
              }}
            />
          ) : (
            <div
              style={{
                padding: '24px',
                textAlign: 'center',
                color: '#5C5852',
                fontFamily: 'JetBrains Mono, monospace',
                fontSize: '18px',
              }}
            >
              IMAGE NODE · {el.assetId}
            </div>
          )}
        </div>
      );
    }

    return null;
  };

  return (
    <div
      ref={containerRef}
      data-testid={`slide-canvas-${spec.slideId}`}
      className={`relative w-full overflow-hidden border border-[#D8D2C5] select-none ${className}`}
      style={{
        aspectRatio: `${spec.width} / ${spec.height}`,
        backgroundColor: spec.backgroundColor,
      }}
    >
      <div
        style={{
          width: `${spec.width}px`,
          height: `${spec.height}px`,
          transform: `scale(${scale})`,
          transformOrigin: 'top left',
          position: 'absolute',
          top: 0,
          left: 0,
          backgroundColor: spec.backgroundColor,
        }}
      >
        {orderedElements.map(renderElement)}
      </div>
    </div>
  );
};
