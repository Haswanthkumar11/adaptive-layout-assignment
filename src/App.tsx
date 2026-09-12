import React, { useState, useMemo } from 'react';
import { sampleAdSpec } from './spec';
import { resolveLayout } from './resolver';
import { SURFACES, type SurfaceProfile } from './surfaces';
import { RenderDom } from './render-dom';

export function App() {
    const [selectedSurface, setSelectedSurface] = useState<SurfaceProfile>(SURFACES[0]);
    const [showDebugOutlines, setShowDebugOutlines] = useState<boolean>(true);

    const resolvedLayout = useMemo(() => {
        return resolveLayout(sampleAdSpec, selectedSurface);
    }, [selectedSurface]);

    const aspectRatio = (resolvedLayout.usableArea.width / resolvedLayout.usableArea.height).toFixed(2);

    return (
        <div style={{ minHeight: '100vh', backgroundColor: '#090d16', color: '#f8fafc', fontFamily: 'system-ui, -apple-system, sans-serif' }}>
            {/* Navigation Header */}
            <header style={{ borderBottom: '1px solid #1e293b', backgroundColor: '#0f172a', padding: '16px 32px' }}>
                <div style={{ maxWidth: '1400px', margin: '0 auto', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                        <h1 style={{ fontSize: '20px', fontWeight: 800, margin: 0, background: 'linear-gradient(135deg, #818cf8 0%, #c084fc 100%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
                            Adaptive Layout Engine
                        </h1>
                        <p style={{ fontSize: '12px', color: '#64748b', margin: '4px 0 0 0' }}>
                            Data-Driven Multi-Surface Ad Constraint Resolver
                        </p>
                    </div>

                    <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '13px', color: '#94a3b8' }}>
                        <input
                            type="checkbox"
                            checked={showDebugOutlines}
                            onChange={(e) => setShowDebugOutlines(e.target.checked)}
                            style={{ accentColor: '#6366f1', width: '16px', height: '16px' }}
                        />
                        Show Safe Area Outlines
                    </label>
                </div>
            </header>

            {/* Content Dashboard */}
            <main style={{ maxWidth: '1400px', margin: '0 auto', padding: '32px', display: 'grid', gridTemplateColumns: '1fr 480px', gap: '32px' }}>
                {/* Left Side: Surface Selector & Canvas Renderer */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                    {/* Surface Picker */}
                    <div style={{ backgroundColor: '#0f172a', borderRadius: '16px', padding: '24px', border: '1px solid #1e293b' }}>
                        <label style={{ fontSize: '12px', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                            Select Target Surface Profile
                        </label>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: '10px', marginTop: '12px' }}>
                            {SURFACES.map((surface) => {
                                const isSelected = surface.id === selectedSurface.id;
                                const is5th = surface.id === 'smart-watch';

                                return (
                                    <button
                                        key={surface.id}
                                        onClick={() => setSelectedSurface(surface)}
                                        style={{
                                            padding: '10px 14px',
                                            borderRadius: '10px',
                                            backgroundColor: isSelected
                                                ? '#4f46e5'
                                                : is5th
                                                    ? 'rgba(236, 72, 153, 0.15)'
                                                    : '#1e293b',
                                            color: isSelected ? '#ffffff' : '#94a3b8',
                                            border: isSelected
                                                ? '2px solid #818cf8'
                                                : is5th
                                                    ? '1px dashed #ec4899'
                                                    : '1px solid #334155',
                                            textAlign: 'left',
                                            cursor: 'pointer',
                                            transition: 'all 0.2s ease',
                                        }}
                                    >
                                        <div style={{ fontWeight: 700, fontSize: '13px', color: isSelected ? '#ffffff' : is5th ? '#f472b6' : '#e2e8f0' }}>
                                            {surface.name}
                                        </div>
                                        <div style={{ fontSize: '11px', opacity: 0.8, marginTop: '2px', fontFamily: 'monospace' }}>
                                            {surface.width} × {surface.height}px
                                        </div>
                                    </button>
                                );
                            })}
                        </div>
                    </div>

                    {/* Renderer Display */}
                    <div style={{ backgroundColor: '#0f172a', borderRadius: '16px', padding: '32px', border: '1px solid #1e293b', minHeight: '540px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', position: 'relative' }}>
                        <div style={{ position: 'absolute', top: '16px', left: '20px', fontSize: '12px', color: '#64748b', fontWeight: 600 }}>
                            DOM RENDERER PREVIEW ({selectedSurface.width} × {selectedSurface.height}px)
                        </div>

                        <RenderDom
                            layout={resolvedLayout}
                            showDebugOutlines={showDebugOutlines}
                        />
                    </div>
                </div>

                {/* Right Side: Resolution Telemetry */}
                <div style={{ backgroundColor: '#1e293b', borderRadius: '16px', padding: '20px', border: '1px solid #334155', display: 'flex', flexDirection: 'column', gap: '16px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <h3 style={{ fontSize: '16px', fontWeight: 700, color: '#f8fafc', margin: 0 }}>
                            Engine Telemetry
                        </h3>
                        <span style={{ padding: '4px 10px', borderRadius: '20px', fontWeight: 700, fontSize: '11px', backgroundColor: resolvedLayout.isValid ? 'rgba(52, 211, 153, 0.2)' : 'rgba(248, 113, 113, 0.2)', color: resolvedLayout.isValid ? '#34d399' : '#f87171', border: `1px solid ${resolvedLayout.isValid ? '#34d399' : '#f87171'}` }}>
                            {resolvedLayout.isValid ? 'VALID LAYOUT' : 'VIOLATIONS DETECTED'}
                        </span>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '10px' }}>
                        <MetricBox label="Surface" value={selectedSurface.name} />
                        <MetricBox label="Size" value={`${selectedSurface.width} × ${selectedSurface.height}px`} />
                        <MetricBox label="Usable Area" value={`${resolvedLayout.usableArea.width} × ${resolvedLayout.usableArea.height}px`} />
                        <MetricBox label="Aspect Ratio" value={`${aspectRatio}:1`} />
                        <MetricBox label="Layout" value={resolvedLayout.composition} />
                    </div>

                    <div>
                        <h4 style={{ color: '#94a3b8', fontSize: '12px', textTransform: 'uppercase', marginBottom: '8px', margin: 0 }}>
                            Resolved Elements
                        </h4>
                        <div style={{ overflowX: 'auto' }}>
                            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '12px' }}>
                                <thead>
                                    <tr style={{ borderBottom: '1px solid #334155', color: '#64748b' }}>
                                        <th style={{ padding: '6px' }}>Element</th>
                                        <th style={{ padding: '6px' }}>Priority</th>
                                        <th style={{ padding: '6px' }}>Status</th>
                                        <th style={{ padding: '6px' }}>Level</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {resolvedLayout.elements.map((elem) => {
                                        const levelFormatted = elem.degradationLevel.charAt(0).toUpperCase() + elem.degradationLevel.slice(1);
                                        return (
                                            <tr key={elem.id} style={{ borderBottom: '1px solid rgba(51, 65, 85, 0.4)' }}>
                                                <td style={{ padding: '6px', fontWeight: 600, color: '#e2e8f0' }}>{elem.type}</td>
                                                <td style={{ padding: '6px' }}>
                                                    <span style={{ color: elem.priority === 1 ? '#f43f5e' : elem.priority === 2 ? '#fbbf24' : '#94a3b8', fontWeight: 600 }}>
                                                        P{elem.priority}
                                                    </span>
                                                </td>
                                                <td style={{ padding: '6px' }}>
                                                    <span style={{ color: elem.visible ? '#34d399' : '#f87171', fontWeight: 600 }}>
                                                        {elem.visible ? 'Visible' : 'Dropped'}
                                                    </span>
                                                </td>
                                                <td style={{ padding: '6px', fontFamily: 'monospace', color: '#cbd5e1' }}>{levelFormatted}</td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                    </div>

                    <div>
                        <h4 style={{ color: '#94a3b8', fontSize: '12px', textTransform: 'uppercase', marginBottom: '6px', margin: 0 }}>
                            Degradation
                        </h4>
                        {resolvedLayout.degradationsApplied.length === 0 ? (
                            <div style={{ color: '#64748b', fontStyle: 'italic', fontSize: '12px' }}>
                                No degradation needed.
                            </div>
                        ) : (
                            <ul style={{ margin: 0, paddingLeft: '16px', color: '#fbbf24', fontSize: '11px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                                {resolvedLayout.degradationsApplied.map((deg, i) => (
                                    <li key={i}>{deg.reason}</li>
                                ))}
                            </ul>
                        )}
                    </div>
                </div>
            </main>
        </div>
    );
}

const MetricBox: React.FC<{ label: string; value: string }> = ({ label, value }) => (
    <div style={{ backgroundColor: '#0f172a', padding: '8px 12px', borderRadius: '8px', border: '1px solid #1e293b' }}>
        <div style={{ fontSize: '10px', color: '#64748b', textTransform: 'uppercase' }}>{label}</div>
        <div style={{ fontSize: '12px', fontWeight: 600, color: '#f1f5f9', marginTop: '2px', fontFamily: 'monospace' }}>{value}</div>
    </div>
);

export default App;
