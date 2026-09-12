export type ViewingDistance = 'near' | 'medium' | 'far'; // the distance from which the user is viewing the ad

export interface SafeArea { // decides the protected margins from all the sides of the screen, so that the elements are not placed in those regions
    top: number;
    right: number;
    bottom: number;
    left: number;
}

export interface SurfaceProfile { // main data strcuture of the file
    id: string;
    name: string;
    width: number;
    height: number;
    safeArea: SafeArea;
    minTextSize: number;
    minTapTarget: number;
    viewingDistance: ViewingDistance;
    touchOnly: boolean;
}

// 1. Mobile Portrait (320 x 480)
export const MOBILE_PORTRAIT: SurfaceProfile = {
    id: 'mobile-portrait',
    name: 'Mobile Portrait',
    width: 320,
    height: 480,
    safeArea: { top: 16, right: 16, bottom: 16, left: 16 },
    minTextSize: 14,
    minTapTarget: 44,
    viewingDistance: 'near',
    touchOnly: true,
};

// 2. Mobile Landscape (480 x 320)
export const MOBILE_LANDSCAPE: SurfaceProfile = {
    id: 'mobile-landscape',
    name: 'Mobile Landscape',
    width: 480,
    height: 320,
    safeArea: { top: 16, right: 16, bottom: 16, left: 16 },
    minTextSize: 14,
    minTapTarget: 44,
    viewingDistance: 'near',
    touchOnly: true,
};

// 3. Broadcast Lower-Third (1920 x 250)
export const BROADCAST_LOWER_THIRD: SurfaceProfile = {
    id: 'broadcast-lower-third',
    name: 'Broadcast Lower-Third',
    width: 1920,
    height: 250,
    safeArea: { top: 20, right: 40, bottom: 20, left: 40 },
    minTextSize: 32, // Far viewing legibility requirement
    minTapTarget: 0,  // TV display / Non-interactive touch
    viewingDistance: 'far',
    touchOnly: false,
};

// 4. Square Retail Kiosk (1080 x 1080)
export const SQUARE_KIOSK: SurfaceProfile = {
    id: 'square-kiosk',
    name: 'Square Retail Kiosk',
    width: 1080,
    height: 1080,
    safeArea: { top: 40, right: 40, bottom: 40, left: 40 },
    minTextSize: 18,
    minTapTarget: 60, // Kiosk touch target requirement
    viewingDistance: 'near',
    touchOnly: true,  // Touch-only requirement
};

// Collection exported for App.tsx surface picker selection
export const SURFACES: SurfaceProfile[] = [
    MOBILE_PORTRAIT,
    MOBILE_LANDSCAPE,
    BROADCAST_LOWER_THIRD,
    SQUARE_KIOSK,
];


