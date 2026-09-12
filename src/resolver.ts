import type { AdSpec, AdElement, Priority, ElementContent } from './spec'; // importing types and constants from spec.ts file 
import type { SurfaceProfile } from './surfaces'; // importing the surface profile from surface.ts file 

export interface Rect { // this is used to define the rectangle
    x: number;
    y: number;
    width: number;
    height: number;
}

export type DegradationLevel = 'full' | 'compact' | 'minimal' | 'hidden'; // this is used to define the degradation level of the element(how much we need to reduce an element to make the layout fit)

export type CompositionType =
    | 'banner-row'        // Aspect ratio >= 3.0 (ultra-wide)
    | 'landscape-split'   // Aspect ratio 1.3 - 3.0 (wide)
    | 'square-grid'       // Aspect ratio 0.8 - 1.3 (square/kiosk)
    | 'portrait-stack';   // Aspect ratio < 0.8 (tall mobile)

export interface ResolvedElement { // this is different from AdElement it describes the input , whereas this ResolvedElement describes the output layout state
    id: string;
    type: string;
    priority: Priority;
    bounds: Rect;
    visible: boolean;
    degradationLevel: DegradationLevel;
    fontSize?: number;
    content: ElementContent;
}

export interface ResolvedLayout { // this is like the complete resolt of this whole resolver.ts file
    surfaceId: string;
    surfaceWidth: number;
    surfaceHeight: number;
    usableArea: Rect;
    composition: CompositionType;
    elements: ResolvedElement[];
    degradationsApplied: Array<{ elementId: string; level: DegradationLevel; reason: string }>;
    violations: string[];
    isValid: boolean;
}

interface ElementDimensions { // this is the intermediate calculation(not the final one because you need the x and y values)
    width: number;
    height: number;
    fontSize?: number;
}

interface ElementSizingMap { // it is liek a lookup table for all the elements in one place id wise
    [elementId: string]: {
        dimensions: ElementDimensions;
        degradationLevel: DegradationLevel;
    };
}

const DEGRADATION_LADDERS: Record<string, DegradationLevel[]> = { // customizing the degradation ladders for different element types(see logo and price for difference)
    logo: ['full', 'compact', 'minimal', 'hidden'],
    price: ['full', 'compact', 'hidden'],
    cta: ['full', 'compact', 'minimal'],
    headline: ['full', 'compact', 'minimal'],
    'product-image': ['full', 'compact', 'minimal'],
};

/**
 * Core Constraint Resolver Engine.
 * Takes an AdSpec and SurfaceProfile and outputs a ResolvedLayout.
 */
export function resolveLayout(adSpec: AdSpec, surface: SurfaceProfile): ResolvedLayout {
    const usableArea = getUsableArea(surface); // calculating the usable area
    const composition = determineComposition(usableArea); // asking which kind of shape to adapt for the available shape

    const degradationState: Record<string, DegradationLevel> = {}; // object that tracks each element's correct state
    for (const elem of adSpec.elements) {
        degradationState[elem.id] = 'full';
    }

    const degradationsApplied: Array<{ elementId: string; level: DegradationLevel; reason: string }> = []; // it stores the decision made by the logic code useful for debugging

    let candidateElements: ResolvedElement[] = []; // new candidate layout created for each iteration
    let violations: string[] = []; // stores issues of the current candidate
    let iteration = 0; // iteration counter
    const maxIterations = 20; // max number of iterations so that the resolver doesnt get stuck in the while loop forever

    while (iteration < maxIterations) { // while loop runs doing ht etrial and error method untill a valid layoutfor the while page 
        iteration++;

        const sizingMap: ElementSizingMap = {}; // it is like a temporary map
        for (const elem of adSpec.elements) { // 
            const level = degradationState[elem.id]; //  calculates current degradation state for each element
            const dimensions = getElementSize(elem, level, surface, usableArea.width, composition); // calculates the size after applying the current degradation state
            sizingMap[elem.id] = { dimensions, degradationLevel: level };
        }

        candidateElements = applyCompositionStrategy( // calculates all the sizes and decides where each element goes
            composition,
            adSpec.elements,
            sizingMap,
            usableArea
        );

        violations = validateLayout(candidateElements, usableArea, surface); // checks for any violations

        if (violations.length === 0) { // loop for checking violations if none found then nothing is returned the loop is breaked
            break;
        }

        const elementToDegrade = findNextElementToDegrade(adSpec.elements, degradationState); // finding elements to degrade for achieveng perfect layout
        if (!elementToDegrade) break; // break if no element is found to degrade

        const currentLevel = degradationState[elementToDegrade.id]; // this is the current degradation level of element
        const ladder = DEGRADATION_LADDERS[elementToDegrade.type] || ['full', 'hidden']; // this is the list of all the degradation levels in order of preference(these are fallbacks)
        const currentIndex = ladder.indexOf(currentLevel); // getting the current index from ladder [full[0] , compact[1], minimal[2] ,hidden[3]]
        const nextLevel = ladder[currentIndex + 1]; // helps in moving to the next degradation level

        degradationState[elementToDegrade.id] = nextLevel; // updates the changes made in the above loop 
        degradationsApplied.push({ // records the history layout
            elementId: elementToDegrade.id,
            level: nextLevel,
            reason: `Degraded P${elementToDegrade.priority} (${elementToDegrade.type}) due to: ${violations[0]}`,
        });
    }

    return { // packages everything into one single object
        surfaceId: surface.id,
        surfaceWidth: surface.width,
        surfaceHeight: surface.height,
        usableArea,
        composition,
        elements: candidateElements,
        degradationsApplied,
        violations,
        isValid: violations.length === 0,
    };
}

export function getUsableArea(surface: SurfaceProfile): Rect { // Remove the safe-area margins from the surface
    const x = surface.safeArea.left;
    const y = surface.safeArea.top;
    const width = Math.max(0, surface.width - surface.safeArea.left - surface.safeArea.right); // calculates the usable width
    const height = Math.max(0, surface.height - surface.safeArea.top - surface.safeArea.bottom); // calculates the usable height
    return { x, y, width, height }; // returns the usable area
}

export function determineComposition(usableArea: Rect): CompositionType { // this decides what  default general arrangements can be used
    if (usableArea.height <= 0) return 'portrait-stack'; // default case if height is zero or less
    const ratio = usableArea.width / usableArea.height;
    if (ratio >= 3.0) return 'banner-row';
    if (ratio >= 1.3) return 'landscape-split';
    if (ratio >= 0.8) return 'square-grid';
    return 'portrait-stack';
}

function getElementSize( // helps us to know how much space each element consumes
    element: AdElement,
    level: DegradationLevel,
    surface: SurfaceProfile,
    containerWidth: number,
    composition: CompositionType
): ElementDimensions {
    if (level === 'hidden') return { width: 0, height: 0 }; // if the element is hidden it takes 0 width and height
    const { minTextSize, minTapTarget } = surface;
    const isBanner = composition === 'banner-row';

    switch (element.type) { // checks the element types and setting condition for each element based on the degradation ladder levels
        case 'headline': {
            let fontSize = 28;
            if (level === 'compact') fontSize = 20;
            if (level === 'minimal') fontSize = Math.max(minTextSize, 14);
            const height = Math.ceil(fontSize * 1.3);
            const width = isBanner ? Math.min(320, containerWidth * 0.25) : containerWidth;
            return { width: Math.round(width), height, fontSize };
        }
        case 'product-image': {
            const ratio = element.aspectRatio || 1.33;
            if (isBanner) {
                const maxHeight = Math.max(40, surface.height - surface.safeArea.top - surface.safeArea.bottom - 16);
                const calcWidth = Math.round(maxHeight * ratio);
                return { width: calcWidth, height: maxHeight };
            }
            let targetWidth = containerWidth;
            if (level === 'compact') targetWidth = containerWidth * 0.75;
            if (level === 'minimal') targetWidth = containerWidth * 0.5;
            const targetHeight = Math.round(targetWidth / ratio);
            return { width: Math.round(targetWidth), height: targetHeight };
        }
        case 'price': {
            let fontSize = 22;
            if (level === 'compact') fontSize = 16;
            if (level === 'minimal') fontSize = Math.max(minTextSize, 14);
            const height = Math.ceil(fontSize * 1.2) + 8;
            return { width: Math.min(containerWidth, 140), height, fontSize };
        }
        case 'cta': {
            let height = 48;
            let fontSize = 16;
            if (level === 'compact') { height = 40; fontSize = 14; }
            if (level === 'minimal') { height = Math.max(minTapTarget, 36); fontSize = Math.max(minTextSize, 12); }
            if (surface.touchOnly && minTapTarget > 0) {
                height = Math.max(height, minTapTarget);
            }
            const width = Math.max(isBanner ? 120 : containerWidth * 0.4, minTapTarget || 100);
            return { width: Math.round(width), height, fontSize };
        }
        case 'logo': {
            const ratio = element.aspectRatio || 2.5;
            let height = 40;
            if (level === 'compact') height = 28;
            if (level === 'minimal') height = 20;
            const width = Math.round(height * ratio);
            return { width, height };
        }
        default:
            return { width: containerWidth, height: 40 };
    }
}

function applyCompositionStrategy( // place all the elements and produce the candidate ResolvedElement[].
    composition: CompositionType,
    elements: AdElement[],
    sizingMap: ElementSizingMap,
    usableArea: Rect
): ResolvedElement[] { // using default composition layouts
    const gap = 12;
    if (composition === 'banner-row') return layoutBannerRow(elements, sizingMap, usableArea, gap);
    if (composition === 'landscape-split') return layoutLandscapeSplit(elements, sizingMap, usableArea, gap);
    return layoutPortraitStack(elements, sizingMap, usableArea, gap);
}

function layoutPortraitStack( // placing the layouts in vertical order
    elements: AdElement[],
    sizingMap: ElementSizingMap,
    usableArea: Rect,
    gap: number
): ResolvedElement[] {
    const resolved: ResolvedElement[] = []; // positioned elements are pushed into this
    let currentY = usableArea.y; // starting at the top of the usable area

    for (const elem of elements) { // looping through the elements and performing the required actions according to the conditions of the layout
        const sizing = sizingMap[elem.id];

        if (!sizing || sizing.degradationLevel === 'hidden') {
            resolved.push({
                id: elem.id,
                type: elem.type,
                priority: elem.priority,
                bounds: {
                    x: usableArea.x,
                    y: currentY,
                    width: 0,
                    height: 0,
                },
                visible: false,
                degradationLevel: 'hidden',
                content: elem.content,
            });
            continue;
        }

        const { dimensions, degradationLevel } = sizing;

        const width = Math.min(dimensions.width, usableArea.width);

        // Never allow an element to extend beyond the usable area.
        const remainingHeight = Math.max(
            0,
            usableArea.y + usableArea.height - currentY
        );

        const height = Math.min(dimensions.height, remainingHeight);

        if (height <= 0) {
            resolved.push({
                id: elem.id,
                type: elem.type,
                priority: elem.priority,
                bounds: {
                    x: usableArea.x,
                    y: currentY,
                    width: 0,
                    height: 0,
                },
                visible: false,
                degradationLevel: 'hidden',
                content: elem.content,
            });
            continue;
        }

        const x =
            usableArea.x +
            Math.round((usableArea.width - width) / 2);

        resolved.push({ // records all the updates done to the elements due to the layout conditions
            id: elem.id,
            type: elem.type,
            priority: elem.priority,
            bounds: {
                x,
                y: currentY,
                width,
                height,
            },
            visible: true,
            degradationLevel,
            fontSize: dimensions.fontSize,
            content: elem.content,
        });

        currentY += height; // helps in creating a vertical stack

        // Only add the gap if there is actually room left.
        if (currentY < usableArea.y + usableArea.height) {
            currentY += gap;
        }
    }

    return resolved;
}

function layoutLandscapeSplit( // dividing the usable width into 2 columns
    elements: AdElement[],
    sizingMap: ElementSizingMap,
    usableArea: Rect,
    gap: number
): ResolvedElement[] {
    const resolved: ResolvedElement[] = [];

    const colWidth = Math.floor(
        (usableArea.width - gap) / 2
    );

    const leftX = usableArea.x;
    const rightX = usableArea.x + colWidth + gap;

    const visualElement = elements.find(
        (e) => e.type === 'product-image'
    ); // image will be on the left

    const rightElements = elements.filter(
        (e) => e.type !== 'product-image'
    ); // eveything else will be on the right

    // LEFT: product image
    if (visualElement) { // it make sures that the image hieght is not more than the usable height and the image is places with perfect margin
        const sizing = sizingMap[visualElement.id];

        if (
            sizing &&
            sizing.degradationLevel !== 'hidden'
        ) {
            const imgWidth = Math.min(
                sizing.dimensions.width,
                colWidth
            );

            const imgHeight = Math.min(
                sizing.dimensions.height,
                usableArea.height
            );

            const imgY =
                usableArea.y +
                Math.round(
                    (usableArea.height - imgHeight) / 2
                );

            resolved.push({ // if image is present the changes and adjustment applied else the width and height is zero
                id: visualElement.id,
                type: visualElement.type,
                priority: visualElement.priority,
                bounds: {
                    x: leftX,
                    y: imgY,
                    width: imgWidth,
                    height: imgHeight,
                },
                visible: true,
                degradationLevel: sizing.degradationLevel,
                content: visualElement.content,
            });
        } else {
            resolved.push({
                id: visualElement.id,
                type: visualElement.type,
                priority: visualElement.priority,
                bounds: {
                    x: leftX,
                    y: usableArea.y,
                    width: 0,
                    height: 0,
                },
                visible: false,
                degradationLevel: 'hidden',
                content: visualElement.content,
            });
        }
    }

    // RIGHT: stack remaining elements
    let rightY = usableArea.y;

    for (const elem of rightElements) { // positioning the rigthside elements(posinitioning ligic is same as the protrait positioning logic)
        const sizing = sizingMap[elem.id];

        if (
            !sizing ||
            sizing.degradationLevel === 'hidden'
        ) {
            resolved.push({
                id: elem.id,
                type: elem.type,
                priority: elem.priority,
                bounds: {
                    x: rightX,
                    y: rightY,
                    width: 0,
                    height: 0,
                },
                visible: false,
                degradationLevel: 'hidden',
                content: elem.content,
            });
            continue;
        }

        const { dimensions, degradationLevel } = sizing;

        const width = Math.min(
            dimensions.width,
            colWidth
        );

        const remainingHeight = Math.max(
            0,
            usableArea.y +
                usableArea.height -
                rightY
        );

        const height = Math.min(
            dimensions.height,
            remainingHeight
        );

        if (height <= 0) {
            resolved.push({
                id: elem.id,
                type: elem.type,
                priority: elem.priority,
                bounds: {
                    x: rightX,
                    y: rightY,
                    width: 0,
                    height: 0,
                },
                visible: false,
                degradationLevel: 'hidden',
                content: elem.content,
            });
            continue;
        }

        resolved.push({
            id: elem.id,
            type: elem.type,
            priority: elem.priority,
            bounds: {
                x: rightX,
                y: rightY,
                width,
                height,
            },
            visible: true,
            degradationLevel,
            fontSize: dimensions.fontSize,
            content: elem.content,
        });

        rightY += height;

        if (
            rightY <
            usableArea.y + usableArea.height
        ) {
            rightY += gap;
        }
    }

    return resolved;
}

function layoutBannerRow( // helps in positioning the elements to the right , we are moving to the right
    elements: AdElement[],
    sizingMap: ElementSizingMap,
    usableArea: Rect,
    gap: number
): ResolvedElement[] { // same ligic applied as the protrait stack but the stack is built horizontally to the right
    const resolved: ResolvedElement[] = [];
    let currentX = usableArea.x;

    for (const elem of elements) {
        const sizing = sizingMap[elem.id];
        if (!sizing || sizing.degradationLevel === 'hidden') {
            resolved.push({
                id: elem.id,
                type: elem.type,
                priority: elem.priority,
                bounds: { x: currentX, y: usableArea.y, width: 0, height: 0 },
                visible: false,
                degradationLevel: 'hidden',
                content: elem.content,
            });
            continue;
        }

        const { dimensions, degradationLevel } = sizing;
        const width = dimensions.width;
        const height = Math.min(dimensions.height, usableArea.height);
        const y = usableArea.y + Math.round((usableArea.height - height) / 2);

        resolved.push({
            id: elem.id,
            type: elem.type,
            priority: elem.priority,
            bounds: { x: currentX, y, width, height },
            visible: true,
            degradationLevel,
            fontSize: dimensions.fontSize,
            content: elem.content,
        });

        currentX += width + gap;
    }

    return resolved;
}

function validateLayout( // checks whether the layout is obeying the rules or not
    elements: ResolvedElement[],
    usableArea: Rect,
    surface: SurfaceProfile
): string[] {
    const violations: string[] = []; //  this collections all the violations
    const visible = elements.filter((e) => e.visible); // ignores the hidden elements

    for (const elem of visible) { //  checks if any elements are going outside the boundaries
        const { x, y, width, height } = elem.bounds;
        if (
            x < usableArea.x ||
            y < usableArea.y ||
            x + width > usableArea.x + usableArea.width + 1 ||
            y + height > usableArea.y + usableArea.height + 1
        ) {
            violations.push(`Element '${elem.id}' overflows usable area bounds.`);
        }
    }

    for (let i = 0; i < visible.length; i++) { //  the loop checks for the overlaps
        for (let j = i + 1; j < visible.length; j++) {
            const a = visible[i].bounds;
            const b = visible[j].bounds;
            if (a.x < b.x + b.width && a.x + a.width > b.x && a.y < b.y + b.height && a.y + a.height > b.y) {
                violations.push(`Overlap detected between '${visible[i].id}' and '${visible[j].id}'.`);
            }
        }
    }

    for (const elem of visible) { //  checks if minimum margin is given  
        if (elem.fontSize && elem.fontSize < surface.minTextSize) {
            violations.push(`Element '${elem.id}' font size ${elem.fontSize}px below minimum ${surface.minTextSize}px.`);
        }
    }

    if (surface.touchOnly && surface.minTapTarget > 0) {
        for (const elem of visible) {
            if (elem.type === 'cta') {
                if (elem.bounds.width < surface.minTapTarget || elem.bounds.height < surface.minTapTarget) {
                    violations.push(`CTA '${elem.id}' target size below minimum tap target ${surface.minTapTarget}px.`);
                }
            }
        }
    }

    return violations;
}

function findNextElementToDegrade(
    elements: AdElement[],
    currentStates: Record<string, DegradationLevel>
): AdElement | null {
    const sorted = [...elements].sort((a, b) => b.priority - a.priority); // the decision making line

    for (const elem of sorted) { //  checks each element
        const currentLevel = currentStates[elem.id];
        const ladder = DEGRADATION_LADDERS[elem.type] || ['full', 'hidden'];
        const currentIndex = ladder.indexOf(currentLevel);
        if (currentIndex !== -1 && currentIndex < ladder.length - 1) {
            return elem;
        }
    }

    return null;
}
