import { describe, expect, it } from 'vitest';
import {
    getUsableArea,
    determineComposition,
    resolveLayout,
} from './resolver';
import { sampleAdSpec } from './spec';
import {
    type SurfaceProfile,
    MOBILE_PORTRAIT,
    MOBILE_LANDSCAPE,
    BROADCAST_LOWER_THIRD,
    SURFACES,
} from './surfaces';

describe('getUsableArea', () => {
    it('calculates the usable area inside the safe area', () => {
        const result = getUsableArea(MOBILE_PORTRAIT);

        expect(result).toEqual({
            x: 16,
            y: 16,
            width: 288,
            height: 448,
        });
    });
});

describe('determineComposition', () => {
    it('returns portrait-stack for a tall layout', () => {
        const result = determineComposition({
            x: 0,
            y: 0,
            width: 288,
            height: 448,
        });

        expect(result).toBe('portrait-stack');
    });
});

describe('resolveLayout', () => {
    it('resolves the sample ad for mobile portrait', () => {
        const result = resolveLayout(sampleAdSpec, MOBILE_PORTRAIT);

        expect(result.surfaceId).toBe('mobile-portrait');
        expect(result.surfaceWidth).toBe(320);
        expect(result.surfaceHeight).toBe(480);

        expect(result.usableArea).toEqual({
            x: 16,
            y: 16,
            width: 288,
            height: 448,
        });

        expect(result.elements.length).toBe(sampleAdSpec.elements.length);
    });
});

describe('resolveLayout - output', () => {
    it('returns a complete resolved layout', () => {
        const result = resolveLayout(sampleAdSpec, MOBILE_PORTRAIT);

        // The resolver should return all five ad elements.
        expect(result.elements).toHaveLength(5);

        // Every element should have a resolved position and size.
        for (const element of result.elements) {
            expect(element.bounds.width).toBeGreaterThanOrEqual(0);
            expect(element.bounds.height).toBeGreaterThanOrEqual(0);
        }

        // The resolver should report the surface it resolved for.
        expect(result.surfaceId).toBe('mobile-portrait');

        // The resolver should provide a final validity result.
        expect(typeof result.isValid).toBe('boolean');
    });
});

describe('resolveLayout - degradation', () => {
    it('degrades lower-priority elements when the surface is constrained', () => {
        const constrainedSurface: SurfaceProfile = {
            id: 'test-constrained',
            name: 'Constrained Test Surface',
            width: 160,
            height: 120,
            safeArea: {
                top: 8,
                right: 8,
                bottom: 8,
                left: 8,
            },
            minTextSize: 14,
            minTapTarget: 44,
            viewingDistance: 'near',
            touchOnly: true,
        };

        const result = resolveLayout(
            sampleAdSpec,
            constrainedSurface
        );

        // Show us which elements the resolver decided to degrade
        // and the reason for each degradation.
        console.log(result.degradationsApplied);

        // The constrained surface should force the resolver
        // to make at least one degradation decision.
        expect(result.degradationsApplied.length).toBeGreaterThan(0);

        // At least one element should no longer be at full size/state.
        expect(
            result.elements.some(
                element => element.degradationLevel !== 'full'
            )
        ).toBe(true);
    });
});

describe('resolveLayout - priority degradation', () => {
    it('degrades lower-priority elements before higher-priority elements', () => {
        const constrainedSurface: SurfaceProfile = {
            id: 'test-priority',
            name: 'Priority Test Surface',
            width: 160,
            height: 120,
            safeArea: {
                top: 8,
                right: 8,
                bottom: 8,
                left: 8,
            },
            minTextSize: 14,
            minTapTarget: 44,
            viewingDistance: 'near',
            touchOnly: true,
        };

        const result = resolveLayout(
            sampleAdSpec,
            constrainedSurface
        );

        // Get the order in which elements were degraded.
        const degradedElementIds = result.degradationsApplied.map(
            degradation => degradation.elementId
        );

        // Logo (P3) should be degraded before Price (P2).
        const logoIndex = degradedElementIds.indexOf('elem-logo');
        const priceIndex = degradedElementIds.indexOf('elem-price');

        expect(logoIndex).toBeGreaterThanOrEqual(0);
        expect(priceIndex).toBeGreaterThanOrEqual(0);
        expect(logoIndex).toBeLessThan(priceIndex);
    });
});

describe('resolveLayout - degradation ladder', () => {
    it('follows the correct degradation levels for the logo', () => {
        const constrainedSurface: SurfaceProfile = {
            id: 'test-ladder',
            name: 'Ladder Test Surface',
            width: 160,
            height: 120,
            safeArea: {
                top: 8,
                right: 8,
                bottom: 8,
                left: 8,
            },
            minTextSize: 14,
            minTapTarget: 44,
            viewingDistance: 'near',
            touchOnly: true,
        };

        const result = resolveLayout(
            sampleAdSpec,
            constrainedSurface
        );

        const logoDegradations = result.degradationsApplied
            .filter(item => item.elementId === 'elem-logo')
            .map(item => item.level);

        expect(logoDegradations).toEqual([
            'compact',
            'minimal',
            'hidden',
        ]);
    });
});

describe('validateLayout - constraints', () => {
    it('detects an element overflowing the usable area', () => {
        const surface = MOBILE_PORTRAIT;

        const result = resolveLayout(sampleAdSpec, surface);

        // Every final visible element should remain inside the usable area.
        for (const element of result.elements) {
            if (!element.visible) continue;

            expect(element.bounds.x).toBeGreaterThanOrEqual(
                result.usableArea.x
            );

            expect(element.bounds.y).toBeGreaterThanOrEqual(
                result.usableArea.y
            );

            expect(
                element.bounds.x + element.bounds.width
            ).toBeLessThanOrEqual(
                result.usableArea.x + result.usableArea.width + 1
            );

            expect(
                element.bounds.y + element.bounds.height
            ).toBeLessThanOrEqual(
                result.usableArea.y + result.usableArea.height + 1
            );
        }
    });
});

describe('validateLayout - tap target', () => {
    it('ensures CTA meets the minimum tap target on touch surfaces', () => {
        const result = resolveLayout(
            sampleAdSpec,
            MOBILE_PORTRAIT
        );

        const cta = result.elements.find(
            element => element.type === 'cta'
        );

        expect(cta).toBeDefined();

        if (!cta) return;

        expect(cta.bounds.width).toBeGreaterThanOrEqual(
            MOBILE_PORTRAIT.minTapTarget
        );

        expect(cta.bounds.height).toBeGreaterThanOrEqual(
            MOBILE_PORTRAIT.minTapTarget
        );
    });
});

describe('validateLayout - text size', () => {
    it('keeps text elements at or above the surface minimum text size', () => {
        const result = resolveLayout(
            sampleAdSpec,
            MOBILE_PORTRAIT
        );

        for (const element of result.elements) {
            if (!element.visible || element.fontSize === undefined) {
                continue;
            }

            expect(element.fontSize).toBeGreaterThanOrEqual(
                MOBILE_PORTRAIT.minTextSize
            );
        }
    });
});

describe('resolveLayout - all surfaces', () => {
    it('resolves the same ad specification for every supported surface', () => {
        for (const surface of SURFACES) {
            const result = resolveLayout(sampleAdSpec, surface);

            expect(result.surfaceId).toBe(surface.id);
            expect(result.surfaceWidth).toBe(surface.width);
            expect(result.surfaceHeight).toBe(surface.height);

            expect(result.usableArea.width).toBe(
                surface.width -
                surface.safeArea.left -
                surface.safeArea.right
            );

            expect(result.usableArea.height).toBe(
                surface.height -
                surface.safeArea.top -
                surface.safeArea.bottom
            );

            expect(result.elements.length).toBe(
                sampleAdSpec.elements.length
            );
        }
    });
});

describe('composition strategies', () => {

    it('places elements vertically in portrait-stack', () => {
        const result = resolveLayout(
            sampleAdSpec,
            MOBILE_PORTRAIT
        );

        const visible = result.elements.filter(e => e.visible);

        for (let i = 1; i < visible.length; i++) {
            expect(visible[i].bounds.y)
                .toBeGreaterThanOrEqual(
                    visible[i - 1].bounds.y +
                    visible[i - 1].bounds.height
                );
        }
    });

    it('uses landscape split for mobile landscape', () => {
        const result = resolveLayout(
            sampleAdSpec,
            MOBILE_LANDSCAPE
        );

        expect(result.composition).toBe('landscape-split');

        const image = result.elements.find(
            e => e.type === 'product-image'
        );

        const headline = result.elements.find(
            e => e.type === 'headline'
        );

        expect(image).toBeDefined();
        expect(headline).toBeDefined();

        if (image && headline) {
            expect(image.bounds.x)
                .toBeLessThan(headline.bounds.x);
        }
    });

    it('uses banner-row for broadcast lower-third', () => {
        const result = resolveLayout(
            sampleAdSpec,
            BROADCAST_LOWER_THIRD
        );

        expect(result.composition).toBe('banner-row');

        const visible = result.elements.filter(e => e.visible);

        for (let i = 1; i < visible.length; i++) {
            expect(visible[i].bounds.x)
                .toBeGreaterThanOrEqual(
                    visible[i - 1].bounds.x +
                    visible[i - 1].bounds.width
                );
        }
    });

});