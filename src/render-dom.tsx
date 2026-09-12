import React from 'react';
import type { ResolvedLayout, ResolvedElement } from './resolver'; // receives the result layout from resolver.ts file

interface RenderDomProps { //  this says what is the render DOM expecting
    layout: ResolvedLayout; //  actual resolved layout from the resolver
    showDebugOutlines?: boolean;
}

export const RenderDom: React.FC<RenderDomProps> = ({ // react component extracting the layout information
    layout,
    showDebugOutlines = true,
}) => {
    const { surfaceWidth, surfaceHeight, usableArea, elements } = layout;

    const maxPreviewWidth = 700;
    const maxPreviewHeight = 520;
    const scale = Math.min(
        1,
        maxPreviewWidth / surfaceWidth,
        maxPreviewHeight / surfaceHeight
    );

    const scaledContainerWidth = surfaceWidth * scale;
    const scaledContainerHeight = surfaceHeight * scale;

    return ( // react UI wrapper
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '16px' }}>
            <div
                style={{
                    width: `${scaledContainerWidth}px`,
                    height: `${scaledContainerHeight}px`,
                    position: 'relative',
                    backgroundColor: '#0f172a',
                    borderRadius: '16px',
                    boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)',
                    border: '2px solid #334155',
                    overflow: 'hidden',
                    transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                }}
            >
                {showDebugOutlines && ( //Only render the safe-area visualization if debugging is enabled
                    <div
                        style={{
                            position: 'absolute',
                            left: `${usableArea.x * scale}px`,
                            top: `${usableArea.y * scale}px`,
                            width: `${usableArea.width * scale}px`,
                            height: `${usableArea.height * scale}px`,
                            border: '1px dashed #38bdf8',
                            backgroundColor: 'rgba(56, 189, 248, 0.03)',
                            pointerEvents: 'none',
                            zIndex: 1,
                        }}
                    />
                )}

                {elements.map((elem) => { // rendering each element box
                    if (!elem.visible) return null;
                    return (
                        <div
                            key={elem.id}
                            style={{
                                position: 'absolute',
                                left: `${elem.bounds.x * scale}px`,
                                top: `${elem.bounds.y * scale}px`,
                                width: `${elem.bounds.width * scale}px`,
                                height: `${elem.bounds.height * scale}px`,
                                transition: 'all 0.3s ease-out',
                                zIndex: 10,
                                boxSizing: 'border-box',
                            }}
                        >
                            {renderElementContent(elem, scale)}
                        </div>
                    );
                })}
            </div>
        </div>
    );
};

function renderElementContent(elem: ResolvedElement, scale: number) {
    const fontSizePx = elem.fontSize ? elem.fontSize * scale : 14 * scale;

    switch (elem.type) { // it decides which kind of element is rendered
        case 'headline': {
            const renderedWidth = elem.bounds.width * scale;
            const renderedHeight = elem.bounds.height * scale;
            const textLength = elem.content.text?.length || 1;
            const maxSingleLineFontSize = Math.max(10 * scale, (renderedWidth - 8) / (textLength * 0.58));
            const maxHeightFontSize = Math.max(10 * scale, (renderedHeight - 8) / 1.2);
            const computedFontSize = Math.min(fontSizePx, maxSingleLineFontSize, maxHeightFontSize);

            return (
                <div
                    style={{
                        width: '100%',
                        height: '100%',
                        boxSizing: 'border-box',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: '#f8fafc',
                        fontWeight: 800,
                        fontSize: `${computedFontSize}px`,
                        textAlign: 'center',
                        lineHeight: 1.2,
                        whiteSpace: 'nowrap',
                        padding: '4px',
                        background: 'linear-gradient(135deg, #ffffff 0%, #cbd5e1 100%)',
                        WebkitBackgroundClip: 'text',
                        WebkitTextFillColor: 'transparent',
                        overflow: 'hidden',
                    }}
                >
                    {elem.content.text}
                </div>
            );
        }

        case 'product-image':
            return (
                <div
                    style={{
                        width: '100%',
                        height: '100%',
                        boxSizing: 'border-box',
                        borderRadius: '12px',
                        overflow: 'hidden',
                        backgroundColor: '#1e293b',
                        boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.3)',
                    }}
                >
                    <img
                        src={elem.content.imageUrl}
                        alt="Product"
                        style={{
                            width: '100%',
                            height: '100%',
                            objectFit: 'cover',
                        }}
                    />
                </div>
            );

        case 'price': {
            const renderedWidth = elem.bounds.width * scale;
            const renderedHeight = elem.bounds.height * scale;
            const hasBadge = elem.degradationLevel === 'full' && elem.content.badge;
            const estimatedCharsEm = hasBadge ? 6.8 : 3.5;
            const maxPriceFontSize = Math.max(10 * scale, (renderedWidth - 16) / estimatedCharsEm);
            const maxHeightFontSize = Math.max(10 * scale, (renderedHeight - 6) / 1.4);
            const computedPriceFontSize = Math.min(fontSizePx, maxPriceFontSize, maxHeightFontSize);

            return (
                <div
                    style={{
                        width: '100%',
                        height: '100%',
                        boxSizing: 'border-box',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: `${Math.max(3, 6 * scale)}px`,
                        fontSize: `${computedPriceFontSize}px`,
                        fontWeight: 700,
                        color: '#34d399',
                        backgroundColor: 'rgba(52, 211, 153, 0.1)',
                        border: '1px solid rgba(52, 211, 153, 0.3)',
                        borderRadius: '8px',
                        padding: '2px 6px',
                        whiteSpace: 'nowrap',
                        overflow: 'hidden',
                    }}
                >
                    <span style={{ flexShrink: 0 }}>
                        {elem.content.currency}
                        {elem.content.priceAmount}
                    </span>
                    {hasBadge && (
                        <span
                            style={{
                                flexShrink: 0,
                                fontSize: `${computedPriceFontSize * 0.8}px`,
                                backgroundColor: '#ef4444',
                                color: '#ffffff',
                                padding: '2px 6px',
                                borderRadius: '4px',
                                fontWeight: 800,
                                lineHeight: 1,
                            }}
                        >
                            {elem.content.badge}
                        </span>
                    )}
                </div>
            );
        }

        case 'cta': {
            const renderedHeight = elem.bounds.height * scale;
            const computedCtaFontSize = Math.min(fontSizePx, Math.max(10 * scale, (renderedHeight - 8) / 1.5));
            return (
                <button
                    style={{
                        width: '100%',
                        height: '100%',
                        boxSizing: 'border-box',
                        backgroundColor: '#6366f1',
                        backgroundImage: 'linear-gradient(135deg, #6366f1 0%, #4f46e5 100%)',
                        color: '#ffffff',
                        border: 'none',
                        borderRadius: '10px',
                        fontSize: `${computedCtaFontSize}px`,
                        fontWeight: 700,
                        cursor: 'pointer',
                        boxShadow: '0 4px 14px 0 rgba(99, 102, 241, 0.4)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '6px',
                        textTransform: 'uppercase',
                        letterSpacing: '0.05em',
                        whiteSpace: 'nowrap',
                        overflow: 'hidden',
                    }}
                >
                    {elem.content.ctaText} →
                </button>
            );
        }

        case 'logo': {
            const renderedHeight = elem.bounds.height * scale;
            const computedLogoFontSize = Math.min(Math.max(10 * scale, fontSizePx * 0.8), Math.max(9 * scale, (renderedHeight - 6) / 1.4));

            return (
                <div
                    style={{
                        width: '100%',
                        height: '100%',
                        boxSizing: 'border-box',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: `${computedLogoFontSize}px`,
                        fontWeight: 700,
                        letterSpacing: '0.1em',
                        color: '#94a3b8',
                        border: '1px solid #334155',
                        borderRadius: '6px',
                        backgroundColor: 'rgba(30, 41, 59, 0.8)',
                        whiteSpace: 'nowrap',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                    }}
                >
                    {elem.content.text}
                </div>
            );
        }

        default:
            return null;
    }
}
