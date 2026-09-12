# Adaptive Layout Engine Architecture

---

## 1. Architecture & System Overview

The **Adaptive Layout Engine** is a framework-independent, data-driven constraint resolution system written in pure TypeScript.

The system maps declarative advertisement content onto dynamic physical surfaces by evaluating usable dimensions, selecting aspect-ratio compositions, calculating element geometry, and enforcing spatial rules through priority-based degradation.

The execution pipeline follows a clear separation:

```text
  spec.ts (AdSpec)  +  surfaces.ts (SurfaceProfile)
                         │
                         ▼
                resolver.ts (Engine)
                         │
                         ▼
             ResolvedLayout (Data Payload)
                         │
                         ▼
             render-dom.tsx (DOM Visualizer)
                         │
                         ▼
             App.tsx (Browser Preview UI)
```

### Core Architecture Roles

- **`spec.ts`**: Defines the advertisement content model, semantic roles, priority rankings ($P1 \rightarrow P3$), and available degradation levels.
- **`surfaces.ts`**: Defines physical target display profiles, including hardware dimensions, safe-area margin insets, legibility rules (`minTextSize`), and touch target rules (`minTapTarget`).
- **`resolver.ts`**: Framework-independent constraint engine. Calculates usable areas, selects layout compositions, computes element sizing, places coordinates, validates spatial boundaries, and performs priority degradation.
- **`render-dom.tsx`**: Presentation component. Converts absolute coordinates from `ResolvedLayout` into visual CSS DOM elements using preview container scaling.
- **`App.tsx`**: Interactive demonstration and debugging dashboard. Supplies active surface profiles to the resolver, renders the scaled DOM preview, and displays live engine telemetry.

---

## 2. File Structure

```text
FlamAI/
├── src/
│   ├── spec.ts          # Ad content schema, element types, priority rankings & sampleAdSpec
│   ├── surfaces.ts      # Hardware surface profiles, safe area insets & legibility rules
│   ├── resolver.ts      # Framework-agnostic constraint engine & validation logic
│   ├── resolver.test.ts # Vitest automated unit test suite (14 passing tests)
│   ├── render-dom.tsx   # Decoupled React DOM renderer component
│   ├── App.tsx          # Interactive demo UI, surface picker & Engine Telemetry panel
│   ├── main.tsx         # React application entry point
│   ├── index.css        # Global styles & base CSS container rules
│   └── App.css          # Application layout styles
├── public/              # Static assets
├── index.html           # HTML entry point
├── package.json         # Project metadata, scripts (vite, vitest) & dependencies
├── tsconfig.json        # TypeScript configuration
├── README.md            # User-facing project guide & operational documentation
└── ARCHITECTURE.md      # Technical system architecture specification
```

---

## 3. Module Responsibilities

| Module | Responsibility | Input | Output / Effect |
| :--- | :--- | :--- | :--- |
| **`spec.ts`** | Defines advertisement content schema, semantic roles, priority rankings, and sample specification | Raw element attributes | Typed `AdSpec`, `AdElement`, `Priority` |
| **`surfaces.ts`** | Defines physical target surface profiles, safe area margins, legibility, and touch constraints | Hardware properties | Typed `SurfaceProfile`, `SafeArea` |
| **`resolver.ts`** | Performs spatial constraint resolution, layout composition, sizing, positioning, validation, and degradation | `AdSpec`, `SurfaceProfile` | `ResolvedLayout` data payload |
| **`resolver.test.ts`** | Verifies mathematical and logical behavior of the constraint resolver via automated unit tests | Test assertions | 14 test results (Vitest suite) |
| **`render-dom.tsx`** | Converts resolved layout payload into scaled, absolute-positioned CSS DOM elements | `ResolvedLayout`, `scale` | Visual React JSX DOM elements |
| **`App.tsx`** | Hosts the surface selector state, invokes the resolver, and displays DOM preview and live telemetry | User interaction state | Mounted React dashboard |
| **`index.css`** | Defines global design tokens, CSS variables, typography, and `#root` flex layout | CSS rules | Global browser style baseline |

---

## 4. Data Flow

The layout resolution data flow operates sequentially without framework coupling:

```text
 1. Ad Specification Defined (spec.ts)
    └─ Defines elements (headline, product-image, price, cta, logo) with assigned priorities (P1-P3).

 2. Target Surface Selected (surfaces.ts / App.tsx)
    └─ Provides surface dimensions (width, height), safeArea insets, minTextSize, minTapTarget.

 3. Usable Area Calculation (resolver.ts -> getUsableArea)
    └─ Subtracts safeArea margins from surface bounds to establish usable content rectangle.

 4. Composition Selection (resolver.ts -> determineComposition)
    └─ Evaluates usable aspect ratio A = usableWidth / usableHeight to choose layout strategy.

 5. Candidate Element Placement (resolver.ts -> applyCompositionStrategy)
    └─ Calculates candidate sizes (getElementSize) and places coordinates (x, y, width, height).

 6. Spatial Constraint Validation (resolver.ts -> validateLayout)
    └─ Checks usable area bounds overflow, element overlap, minTextSize, and minTapTarget.

 7. Priority-Based Degradation Iteration (resolver.ts -> findNextElementToDegrade)
    └─ If violations exist, degrades lowest-priority element (P3 -> P2 -> P1) and re-evaluates layout.

 8. Resolved Payload Return (resolver.ts)
    └─ Returns complete ResolvedLayout object with element bounds, degradation audit, and isValid flag.

 9. Visual DOM Rendering (render-dom.tsx -> RenderDom)
    └─ Scales resolved coordinates for preview container display and positions CSS absolute nodes.
```

React is strictly excluded from steps 1 through 8; it only participates at step 9 to render the returned payload.

---

## 5. Resolver Algorithm

The core layout engine in [`src/resolver.ts`](file:///c:/Users/HASWANTH%20KUMAR%20D/Desktop/FlamAI/src/resolver.ts) implements the following functions:

### `getUsableArea(surface: SurfaceProfile): Rect`
- **Purpose**: Computes usable content area after subtracting safe-area margins.
- **Inputs**: `SurfaceProfile`.
- **Output**: `Rect` (`x`, `y`, `width`, `height`).
- **Logic**: $\text{x} = \text{safeArea.left}, \text{y} = \text{safeArea.top}$, $\text{width} = \text{width} - \text{left} - \text{right}$, $\text{height} = \text{height} - \text{top} - \text{bottom}$.

### `determineComposition(usableArea: Rect): CompositionType`
- **Purpose**: Selects general composition strategy based on usable aspect ratio.
- **Inputs**: Usable `Rect`.
- **Output**: `'banner-row'` | `'landscape-split'` | `'square-grid'` | `'portrait-stack'`.
- **Thresholds**: Ratio $A = \frac{\text{width}}{\text{height}}$:
  - $A \ge 3.0 \rightarrow \text{'banner-row'}$
  - $A \ge 1.3 \rightarrow \text{'landscape-split'}$
  - $A \ge 0.8 \rightarrow \text{'square-grid'}$
  - $A < 0.8 \rightarrow \text{'portrait-stack'}$

### `getElementSize(element, level, surface, containerWidth, composition): ElementDimensions`
- **Purpose**: Calculates target dimensions (`width`, `height`, `fontSize`) per element based on degradation level and surface constraints.
- **Inputs**: `AdElement`, `DegradationLevel`, `SurfaceProfile`, `containerWidth`, `CompositionType`.
- **Output**: `{ width, height, fontSize? }`.
- **Rules**:
  - `headline`: Font size 28px (`full`), 20px (`compact`), $\max(\text{minTextSize}, 14\text{px})$ (`minimal`). Height $= \lceil \text{fontSize} \times 1.3 \rceil$.
  - `product-image`: Preserves aspect ratio 1.33. In banner mode, height fits usable height; in stack mode, width scales from $100\%$ (`full`) to $75\%$ (`compact`) to $50\%$ (`minimal`).
  - `price`: Height $= \lceil \text{fontSize} \times 1.2 \rceil + 8\text{px}$. Width capped at $\min(\text{containerWidth}, 140\text{px})$.
  - `cta`: Height = 48px (`full`), 40px (`compact`), $\max(\text{minTapTarget}, 36\text{px})$ (`minimal`). Enforces $\max(\text{height}, \text{minTapTarget})$ on touch surfaces.
  - `logo`: Height = 40px (`full`), 28px (`compact`), 20px (`minimal`). Preserves aspect ratio 2.5 ($\text{width} = \text{height} \times 2.5$).

### `applyCompositionStrategy(...)` & Layout Positioning Functions
- **`layoutPortraitStack()`**: Positions elements vertically centered, incrementing `currentY` by `height + gap` ($12\text{px}$).
- **`layoutLandscapeSplit()`**: Divides usable width into 2 equal columns ($\text{colWidth} = \lfloor(\text{usableWidth} - \text{gap}) / 2\rfloor$). Visual `product-image` is placed on the left column; remaining elements are stacked vertically on the right column.
- **`layoutBannerRow()`**: Positions elements horizontally side-by-side, incrementing `currentX` by `width + gap` ($12\text{px}$).

### `validateLayout(elements, usableArea, surface): string[]`
- **Purpose**: Checks candidate element positions against 4 constraint rules.
- **Output**: Array of violation strings (empty if layout is valid).

### `findNextElementToDegrade(elements, currentStates): AdElement | null`
- **Purpose**: Identifies next lowest-priority element eligible for degradation.
- **Inputs**: `AdElement[]`, `currentStates` lookup map.
- **Output**: `AdElement` to degrade, or `null` if all elements are fully degraded/hidden.

### `resolveLayout(adSpec: AdSpec, surface: SurfaceProfile): ResolvedLayout`
- **Purpose**: Main engine entry point. Runs iterative degradation loop (max 20 iterations) until `validateLayout` returns 0 violations.

---

## 6. Composition Strategies

The engine implements four defined composition types:

### 1. `portrait-stack`
- **Selected when**: Aspect ratio $A < 0.8$ (Tall mobile screens).
- **Arrangement**: Single vertical column inside usable area. Elements are horizontally centered with $12\text{px}$ gaps.

### 2. `landscape-split`
- **Selected when**: Aspect ratio $1.3 \le A < 3.0$ (Wide mobile/tablet screens).
- **Arrangement**: Two-column layout. The visual `product-image` occupies the left column; information elements (`headline`, `price`, `cta`, `logo`) stack in the right column.

### 3. `banner-row`
- **Selected when**: Aspect ratio $A \ge 3.0$ (Ultra-wide broadcast lower-third displays).
- **Arrangement**: Single horizontal row. Elements are placed side-by-side with $12\text{px}$ horizontal gaps.

### 4. `square-grid`
- **Selected when**: Aspect ratio $0.8 \le A < 1.3$ (Square kiosk displays).
- **Arrangement**: Evaluated by `determineComposition()`. Delegates positioning to `layoutPortraitStack()`, utilizing the balanced square usable area for vertical centering.

---

## 7. Priority & Degradation

The degradation system protects critical content while allowing lower-priority elements to reduce size or hide under spatial constraints.

### Priority Hierarchy (from `spec.ts`)
- **`Priority 1` (Critical)**: `headline`, `product-image`
- **`Priority 2` (Important)**: `price`, `cta`
- **`Priority 3` (Expendable)**: `logo`

### Degradation Ladders
```typescript
const DEGRADATION_LADDERS: Record<string, DegradationLevel[]> = {
    logo:            ['full', 'compact', 'minimal', 'hidden'],
    price:           ['full', 'compact', 'hidden'],
    cta:             ['full', 'compact', 'minimal'],
    headline:        ['full', 'compact', 'minimal'],
    'product-image': ['full', 'compact', 'minimal'],
};
```

### Search & Selection Logic (`findNextElementToDegrade`)
Elements are sorted descending by priority value:
$$\text{Priority 3 (Logo)} \longrightarrow \text{Priority 2 (Price/CTA)} \longrightarrow \text{Priority 1 (Headline/Image)}$$

1. The resolver checks P3 (`logo`) first. If `logo` can step down (e.g. `full` $\rightarrow$ `compact`), it degrades.
2. `logo` is degraded through `minimal` to `hidden` before any P2 element is modified.
3. If P3 is fully degraded and violations persist, P2 elements (`price`, `cta`) degrade.
4. P1 elements are protected until lower priorities are exhausted.
5. When an element degrades to `'hidden'`, `getElementSize()` returns `{ width: 0, height: 0 }`, `visible` is set to `false`, and the element surrenders its layout space.

---

## 8. Validation & Constraints

`validateLayout()` enforces four spatial rules on all visible elements:

1. **Usable-Area Bounds**: Bounding box $(x, y, w, h)$ must fit inside `usableArea`:
   $$x \ge \text{usable.x}, \quad y \ge \text{usable.y}, \quad x+w \le \text{usable.x}+\text{usable.w}+1, \quad y+h \le \text{usable.y}+\text{usable.h}+1$$
2. **Element Overlap**: No two visible elements may intersect:
   $$\text{Overlap}(A, B) = (A.x < B.x + B.w) \land (A.x + A.w > B.x) \land (A.y < B.y + B.h) \land (A.y + A.h > B.y)$$
3. **Minimum Text Size**: If `fontSize` is defined, it must satisfy $\text{fontSize} \ge \text{surface.minTextSize}$.
4. **Minimum Tap Target**: On `touchOnly` surfaces with $\text{minTapTarget} > 0$, CTA buttons must satisfy $\text{width} \ge \text{minTapTarget}$ and $\text{height} \ge \text{minTapTarget}$.

---

## 9. Rendering Boundary

The presentation component `<RenderDom />` in [`src/render-dom.tsx`](file:///c:/Users/HASWANTH%20KUMAR%20D/Desktop/FlamAI/src/render-dom.tsx) converts `ResolvedLayout` into CSS:

### Decoupled Coordinate Mapping
- `resolver.ts` outputs unscaled surface coordinates in pixels.
- `render-dom.tsx` calculates container display scaling:
  $$\text{scale} = \min\left(1, \frac{700}{\text{surfaceWidth}}, \frac{520}{\text{surfaceHeight}}\right)$$
- Each element box is positioned using absolute CSS:
  $$\text{left} = \text{bounds.x} \times \text{scale}, \quad \text{top} = \text{bounds.y} \times \text{scale}$$
  $$\text{width} = \text{bounds.width} \times \text{scale}, \quad \text{height} = \text{bounds.height} \times \text{scale}$$

Preview container scaling adjusts display size inside the browser dashboard without altering underlying resolved layout coordinates.

---

## 10. Testing Architecture

[`src/resolver.test.ts`](file:///c:/Users/HASWANTH%20KUMAR%20D/Desktop/FlamAI/src/resolver.test.ts) contains automated unit tests for the constraint resolver using Vitest.

Tests verify mathematical and logical correctness of `resolver.ts` independently of browser DOM rendering.

### Test Categories Implemented
- **Safe-Area Calculation**: Asserts `getUsableArea()` correctly subtracts safeArea insets.
- **Composition Selection**: Asserts `determineComposition()` maps usable aspect ratios to composition types.
- **Layout Resolution & Output**: Asserts `resolveLayout()` returns complete `ResolvedLayout` with valid bounds and boolean flags.
- **Constraint-Based Degradation**: Asserts constrained surfaces ($160 \times 120\text{px}$) trigger degradation logs.
- **Priority Degradation Order**: Asserts Priority 3 (`logo`) degrades before Priority 2 (`price`).
- **Degradation Ladder Execution**: Asserts logo steps through `compact` $\rightarrow$ `minimal` $\rightarrow$ `hidden`.
- **Bounds Overflow Validation**: Asserts all visible element bounds stay inside `usableArea`.
- **Tap Target Validation**: Asserts CTA meets `minTapTarget` on touch surfaces.
- **Text Size Validation**: Asserts font sizes satisfy `minTextSize`.
- **Multi-Surface Resolution**: Iterates through all profiles in `SURFACES` array.
- **Composition Strategies**: Verifies vertical positioning in `portrait-stack`, column separation in `landscape-split`, and horizontal placement in `banner-row`.

### Verified Test Results
- **Test Framework**: Vitest
- **Test Files**: `1 passed` (`src/resolver.test.ts`)
- **Tests**: `14 passed` (14 total)
- **Failing**: `0`

---

## 11. Design Invariants

The codebase enforces six architectural invariants:

1. **Framework-Independent Resolver**: `src/resolver.ts` has zero imports from React or DOM APIs.
2. **Zero Surface-ID Branching**: The resolver evaluates physical properties (`width`, `height`, `safeArea`, `minTextSize`, `minTapTarget`, aspect ratio) rather than checking `if (surface.id === '...')`.
3. **Deterministic Layout Resolution**: Identical `(AdSpec, SurfaceProfile)` inputs produce identical `ResolvedLayout` outputs.
4. **Priority-Based Degradation**: $P3$ elements degrade fully before $P2$ elements degrade, protecting $P1$ hero content.
5. **Mathematical Constraint Enforcement**: Every layout candidate is verified against bounds, collision, legibility, and tap target rules before output.
6. **Decoupled Rendering Boundary**: Renderer displays resolved payloads via absolute positioning without modifying layout coordinates.
