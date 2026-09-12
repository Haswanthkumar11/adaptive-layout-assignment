# Adaptive Layout Engine for Multi-Surface Ads

## 1. Project Overview

This project is an **adaptive layout engine for advertisements**.

The main idea is simple:

> Define one advertisement once, give the engine a target surface, and
> let the engine decide how the advertisement should fit that surface.

The same advertisement contains five elements:

1. **Headline**
2. **Product Image**
3. **Price**
4. **CTA / Shop Now button**
5. **Logo / Branding**

The engine supports four target surfaces:

- **Mobile Portrait** --- `320 × 480`
- **Mobile Landscape** --- `480 × 320`
- **Broadcast Lower-Third** --- `1920 × 250`
- **Square Retail Kiosk** --- `1080 × 1080`

The important part of the assignment is that these are **not four
separately hardcoded pages**. The same ad specification is passed
through the same TypeScript resolution pipeline and is composed
differently according to the available space and surface constraints.

---

# 2. What the Assignment Asked For

The assignment is about building a system that can adapt one content
specification to different physical surfaces.

The main requirements were:

- Define the ad content once.
- Define real surface constraints.
- Calculate the usable area after safe-area margins.
- Select a suitable composition based on aspect ratio.
- Size and position elements.
- Respect element priorities.
- Degrade lower-priority elements when space is insufficient.
- Never intentionally allow overlaps or clipping.
- Produce meaningfully different layouts for different aspect ratios.
- Keep the layout engine independent from React.
- Render the resolved result to the browser.
- Demonstrate the result through a small interactive application.
- Explain the algorithm clearly.

The assignment specifically warns against using surface-specific
branches such as:

```ts
if (surface === "mobile") {
    // mobile layout
}
```

and against using CSS media queries as the actual layout engine.

The project therefore keeps the **decision-making inside TypeScript**
and uses React mainly to display the resolved result.

---

# 3. High-Level Architecture

The project follows this separation:

```text
                ┌──────────────────────┐
                │     Ad Specification │
                │       spec.ts        │
                └──────────┬───────────┘
                           │
                           │
                ┌──────────▼───────────┐
                │   Surface Profile    │
                │     surfaces.ts      │
                └──────────┬───────────┘
                           │
                           ▼
                ┌──────────────────────┐
                │   Constraint Engine  │
                │     resolver.ts      │
                │                      │
                │ • usable area        │
                │ • composition        │
                │ • element sizing     │
                │ • positioning        │
                │ • validation         │
                │ • degradation        │
                └──────────┬───────────┘
                           │
                           ▼
                ┌──────────────────────┐
                │    ResolvedLayout    │
                │ position + size +    │
                │ visibility + level   │
                └──────────┬───────────┘
                           │
                           ▼
                ┌──────────────────────┐
                │      RenderDom       │
                │   render-dom.tsx     │
                └──────────┬───────────┘
                           │
                           ▼
                ┌──────────────────────┐
                │     Browser DOM      │
                │   Scaled CSS Output  │
                └──────────────────────┘
```

This separation is one of the most important architectural decisions in
the project.

---

# 4. Complete Resolution Workflow

The complete flow is:

```text
User selects a surface
        │
        ▼
App.tsx gets selected surface
        │
        ├───────────────┐
        │               │
        ▼               ▼
   sampleAdSpec     SurfaceProfile
    (spec.ts)       (surfaces.ts)
        │               │
        └───────┬───────┘
                ▼
        resolveLayout()
          (resolver.ts)
                │
                ▼
        Calculate Safe Area
                │
                ▼
      Calculate Usable Area
                │
                ▼
     Select Composition Type
                │
                ▼
       Calculate Element Sizes
                │
                ▼
       Position the Elements
                │
                ▼
        Validate the Layout
          /            \
       Valid           Invalid
        │                 │
        │                 ▼
        │        Find lowest-priority
        │        element to degrade
        │                 │
        │                 ▼
        │        full → compact →
        │        minimal → hidden
        │                 │
        │                 └───────┐
        │                         │
        └─────────────────────────┘
                  │
                  ▼
          ResolvedLayout
                  │
                  ▼
             RenderDom
                  │
                  ▼
          Final DOM Preview
```

This is the core workflow of the application.

---

# 5. Project File Structure

```text
FlamAI/
│
├── src/
│   ├── spec.ts
│   ├── surfaces.ts
│   ├── resolver.ts
│   ├── resolver.test.ts
│   ├── render-dom.tsx
│   ├── App.tsx
│   ├── main.tsx
│   ├── index.css
│   └── App.css
│
├── public/
│   └── static assets
│
├── index.html
├── package.json
├── tsconfig.json
├── README.md
└── ARCHITECTURE.md
```

---

# 6. File-by-File Explanation

## `src/spec.ts` --- Advertisement Specification

This file describes **what the advertisement contains**.

It is independent of the physical surface.

### Main responsibilities

- Define the `Priority` type.
- Define element types.
- Define `AdElement`.
- Define `AdSpec`.
- Define element content.
- Provide the sample advertisement specification.

The sample advertisement contains:

```text
Headline
    │
Product Image
    │
Price
    │
CTA
    │
Logo
```

### Priority model

The project uses:

```text
P1 → Most important
P2 → Important
P3 → Lowest priority
```

The purpose of the priority is not to decide the normal visual order. It
tells the resolver **which elements should be protected when space
becomes limited**.

---

## `src/surfaces.ts` --- Surface Constraints

This file describes the physical target.

A surface is more than just width and height.

It contains information such as:

- Width
- Height
- Safe-area margins
- Minimum text size
- Minimum tap target
- Touch interaction requirements
- Viewing conditions

The four implemented profiles are:

```text
┌──────────────────────────────┐
│ Mobile Portrait              │
│ 320 × 480                    │
│ Tall / narrow                │
└──────────────────────────────┘

┌──────────────────────────────┐
│ Mobile Landscape             │
│ 480 × 320                    │
│ Wide / short                 │
└──────────────────────────────┘

┌──────────────────────────────────────────┐
│ Broadcast Lower-Third                    │
│ 1920 × 250                               │
│ Very wide / far viewing distance         │
└──────────────────────────────────────────┘

┌──────────────────────────────┐
│ Square Retail Kiosk          │
│ 1080 × 1080                  │
│ Square / touch surface       │
└──────────────────────────────┘
```

The resolver reads these constraints instead of having four separate
layout implementations.

---

# 7. `src/resolver.ts` --- The Core Engine

This is the most important file in the project.

It is framework-independent TypeScript.

The resolver receives:

```text
AdSpec + SurfaceProfile
```

and returns:

```text
ResolvedLayout
```

The main functions are described below.

---

## 7.1 `resolveLayout()`

### Purpose

This is the main entry point of the layout engine.

### Workflow

```text
AdSpec + SurfaceProfile
          │
          ▼
   getUsableArea()
          │
          ▼
 determineComposition()
          │
          ▼
 Initialize all elements as "full"
          │
          ▼
       Try layout
          │
          ▼
      Validate it
       /       \
   Valid       Invalid
     │            │
     │            ▼
     │      Find element to degrade
     │            │
     │            ▼
     │       Advance degradation
     │            │
     │            └───────► Try again
     │
     ▼
ResolvedLayout
```

The resolver keeps trying until:

- the layout becomes valid, or
- there is no further degradation available, or
- the safety iteration limit is reached.

The current implementation uses a maximum of 20 iterations.

---

## 7.2 `getUsableArea()`

### Purpose

A surface may contain areas where content should not be placed.

The function removes the safe-area margins.

```text
Full Surface
┌───────────────────────────────┐
│       Safe Area Margin        │
│   ┌───────────────────────┐   │
│   │                       │   │
│   │      USABLE AREA      │   │
│   │                       │   │
│   └───────────────────────┘   │
│       Safe Area Margin        │
└───────────────────────────────┘
```

Conceptually:

```text
usable width
= surface width
- left safe area
- right safe area

usable height
= surface height
- top safe area
- bottom safe area
```

The returned rectangle contains:

```text
x
y
width
height
```

This rectangle becomes the boundary for the layout engine.

---

## 7.3 `determineComposition()`

### Purpose

The engine looks at the aspect ratio of the usable area and selects a
general composition.

```text
Usable Area
     │
     ▼
width / height
     │
     ├── ratio >= 3.0
     │        │
     │        ▼
     │    banner-row
     │
     ├── ratio >= 1.3
     │        │
     │        ▼
     │  landscape-split
     │
     ├── ratio >= 0.8
     │        │
     │        ▼
     │    square-grid
     │
     └── otherwise
              │
              ▼
        portrait-stack
```

This means the same ad specification can receive a different composition
without having four separate page implementations.

---

# 8. Element Sizing

## `getElementSize()`

### Purpose

This function calculates the dimensions of an element based on:

- Element type
- Current degradation level
- Surface constraints
- Available width
- Selected composition

For example, the CTA can have different sizes at:

```text
full
  ↓
compact
  ↓
minimal
```

The same idea applies to other element types.

### Element sizing workflow

```text
Element
   │
   ▼
Current degradation level
   │
   ▼
Surface constraints
   │
   ▼
Available width
   │
   ▼
Composition type
   │
   ▼
Calculate width / height / font size
```

---

# 9. Composition Strategies

The engine currently uses three main implemented positioning strategies.

## 9.1 `layoutPortraitStack()`

Used for tall layouts.

```text
┌───────────────────────┐
│       HEADLINE        │
│                       │
│     PRODUCT IMAGE     │
│                       │
│        PRICE          │
│                       │
│         CTA           │
│                       │
│         LOGO          │
└───────────────────────┘
```

### Workflow

```text
Start at usable-area top
          │
          ▼
Place element
          │
          ▼
Add element height
          │
          ▼
Add gap
          │
          ▼
Place next element
          │
          ▼
Repeat
```

The current global gap is `12px`.

---

## 9.2 `layoutLandscapeSplit()`

Used for wider layouts.

The product image is placed on the left and the remaining content is
placed on the right.

```text
┌─────────────────────────────────────────┐
│                                         │
│   ┌─────────────┐    HEADLINE           │
│   │             │                       │
│   │   PRODUCT   │    PRICE              │
│   │    IMAGE    │                       │
│   │             │    CTA                │
│   │             │                       │
│   └─────────────┘    LOGO               │
│                                         │
└─────────────────────────────────────────┘
```

### Workflow

```text
Usable Area
     │
     ▼
Divide width into two columns
     │
     ├───────────────┐
     ▼               ▼
Left column      Right column
     │               │
     ▼               ▼
Product image    Headline
                 Price
                 CTA
                 Logo
```

This creates a genuinely different composition instead of simply
shrinking the portrait layout.

---

## 9.3 `layoutBannerRow()`

Used for ultra-wide layouts such as the broadcast lower-third.

```text
┌─────────────────────────────────────────────────────────────┐
│ HEADLINE → IMAGE → PRICE → CTA → LOGO                      │
└─────────────────────────────────────────────────────────────┘
```

### Workflow

```text
Start at usable-area left
          │
          ▼
Place element
          │
          ▼
Add element width
          │
          ▼
Add gap
          │
          ▼
Move horizontally
          │
          ▼
Place next element
```

This is why the broadcast layout is horizontally composed instead of
looking like a scaled-down mobile layout.

---

# 10. Layout Validation

## `validateLayout()`

The resolver does not simply place elements and assume they fit.

It checks the result.

The validation checks include:

### 1. Surface bounds

```text
Does the element stay inside the usable area?
```

### 2. Element overlap

```text
Does element A overlap element B?
```

### 3. Minimum text size

Important for surfaces such as broadcast where the content is viewed
from farther away.

### 4. Minimum tap target

Important for touch surfaces.

```text
Candidate Layout
       │
       ▼
   Validation
       │
       ├── overflow?
       ├── overlap?
       ├── text too small?
       └── tap target too small?
```

If any required rule fails, the layout is considered invalid.

---

# 11. Priority-Based Degradation

## `findNextElementToDegrade()`

This is the part that makes the engine adaptive instead of simply
overflowing.

The basic idea is:

```text
P3 → degrade first
P2 → degrade next
P1 → protect as long as possible
```

Example:

```text
Available space becomes smaller
             │
             ▼
        Is layout valid?
             │
            NO
             │
             ▼
       Look at priorities
             │
             ▼
          P3 first
             │
             ▼
      Try compact/minimal
             │
             ▼
        Validate again
             │
          ┌──┴──┐
        valid  invalid
          │       │
          │       ▼
          │      P2
          │       │
          │       ▼
          │    Try again
          │
          ▼
        Finish
```

The important principle is:

> A lower-priority element should give up space before a higher-priority
> element is compromised.

---

# 12. Degradation Ladders

The engine uses degradation levels:

```text
FULL
  ↓
COMPACT
  ↓
MINIMAL
  ↓
HIDDEN
```

Not every element has every level.

For example, the logo can move through:

```text
full → compact → minimal → hidden
```

while other elements may have a shorter ladder.

This gives the engine multiple chances to solve a difficult layout
before removing an element.

---

# 13. Final Resolved Output

The resolver returns a `ResolvedLayout`.

Conceptually:

```text
ResolvedLayout
│
├── surfaceId
├── surfaceWidth
├── surfaceHeight
├── usableArea
├── composition
│
├── elements[]
│   ├── id
│   ├── type
│   ├── priority
│   ├── bounds
│   ├── visible
│   ├── degradationLevel
│   └── content
│
├── degradationsApplied[]
├── violations[]
└── isValid
```

This is the contract between the engine and the renderer.

---

# 14. `src/render-dom.tsx` --- Rendering Layer

The renderer receives the already-resolved layout.

It does **not** decide:

- which element goes where
- which element should be removed
- which priority wins
- which composition should be used

Those decisions have already been made by `resolver.ts`.

The renderer's job is:

```text
ResolvedLayout
      │
      ▼
Read element bounds
      │
      ▼
Apply preview scale
      │
      ▼
Create positioned DOM elements
      │
      ▼
Render content
```

Elements are displayed using scaled CSS positioning.

```text
left   = resolved x × scale
top    = resolved y × scale
width  = resolved width × scale
height = resolved height × scale
```

This keeps the preview visually manageable while preserving the original
surface coordinates.

---

# 15. Safe-Area Debug Visualization

The preview can display a dashed safe-area outline.

The purpose is to help understand:

```text
Full surface
     │
     ▼
Safe-area margins removed
     │
     ▼
Usable content region
```

The safe-area outline is a **debugging aid**, not part of the actual
advertisement.

This distinction is important:

```text
Safe Area Bounds
        ≠
Advertisement element
```

It is only showing the boundary that the resolver is expected to
respect.

---

# 16. `src/App.tsx` --- Demo Application

`App.tsx` connects the engine to the user interface.

It is responsible for:

- Showing the surface picker.
- Keeping track of the selected surface.
- Passing the ad spec and selected surface to the resolver.
- Showing the DOM preview.
- Showing engine telemetry.

The important data flow is:

```text
Surface Picker
      │
      ▼
selectedSurface
      │
      ▼
resolveLayout(sampleAdSpec, selectedSurface)
      │
      ├──────────────► RenderDom
      │
      └──────────────► Engine Telemetry
```

---

# 17. Engine Telemetry

The telemetry exists to make the engine's decision visible.

The useful information is:

```text
ENGINE TELEMETRY

Surface
Mobile Portrait

Size
320 × 480

Usable Area
288 × 448

Layout
portrait-stack
```

Then:

```text
RESOLVED ELEMENTS

Element          Priority   Status      Level
------------------------------------------------
headline         P1         Visible     Full
product-image    P1         Visible     Full
price            P2         Visible     Full
cta              P2         Visible     Full
logo             P3         Visible     Full
```

And finally:

```text
DEGRADATION

No degradation needed.
```

If degradation actually happens, the message should come from the real
resolver result.

The telemetry is not supposed to contain hardcoded results for each
surface.

---

# 18. Why Telemetry Matters

The telemetry helps an evaluator see the complete system:

```text
Surface
   ↓
Constraints
   ↓
Available space
   ↓
Priority
   ↓
Engine decision
   ↓
Resolved elements
   ↓
Rendered result
```

Without telemetry, the project could look like a normal responsive UI.

With telemetry, it is much easier to demonstrate that a layout engine is
actually making the decisions.

---

# 19. `src/main.tsx`

This is the React entry point.

Its job is simple:

```text
Browser
  │
  ▼
main.tsx
  │
  ▼
React root
  │
  ▼
App.tsx
```

It connects the React application to the browser DOM.

---

# 20. `src/index.css`

This contains global CSS and base layout rules.

During development, this file became important because the renderer
preview was affected by the size of its surrounding containers.

One important lesson from the debugging process was:

> The resolver can calculate correct surface coordinates while the
> browser preview container can still constrain the visual result.

The project therefore separates:

```text
Engine coordinates
        from
Browser preview container
```

The final preview container needs enough room to display the resolved
surface without introducing browser-level overflow or compression.

---

# 21. `src/App.css`

This contains application-level styling for the dashboard.

It controls the visual presentation of:

- Surface selector
- Telemetry panel
- Preview card
- Dashboard layout
- General spacing and visual styling

It should not become a replacement for the TypeScript resolver.

The CSS displays the result; the resolver decides the result.

---

# 22. `index.html`

This is the browser entry HTML file.

Its main job is to provide the root element where React mounts the
application.

```text
index.html
     │
     ▼
<div id="root">
     │
     ▼
main.tsx
     │
     ▼
App.tsx
```

---

# 23. `package.json`

Contains the project's development dependencies and scripts.

The project uses:

- React
- TypeScript
- Vite
- Vitest
- Oxlint

These tools support the application, type checking, testing, and code
quality.

---

# 24. `tsconfig.json`

Controls TypeScript compilation.

TypeScript is important in this project because the assignment
specifically asks for typed:

- Advertisement specifications
- Surface profiles
- Resolved layouts
- Element bounds
- Priorities
- Degradation states

---

# 25. `ARCHITECTURE.md`

This is the deeper architecture documentation.

The README explains the project in a readable way.

The architecture document can be used when a reviewer wants more
implementation-level detail.

---

# 26. Four Surface Layouts

The same five-element advertisement is intentionally composed
differently.

## Mobile Portrait

```text
┌──────────────────────┐
│      HEADLINE        │
│                      │
│    PRODUCT IMAGE     │
│                      │
│        PRICE         │
│                      │
│         CTA          │
│                      │
│        LOGO          │
└──────────────────────┘
```

Reason:

The surface is tall and narrow, so a vertical stack is natural.

---

## Mobile Landscape

```text
┌─────────────────────────────────────┐
│                                     │
│  ┌──────────────┐  HEADLINE         │
│  │              │                   │
│  │ PRODUCT      │  PRICE            │
│  │ IMAGE        │                   │
│  │              │  CTA              │
│  └──────────────┘                   │
│                       LOGO          │
└─────────────────────────────────────┘
```

Reason:

The wider aspect ratio allows two columns.

---

## Broadcast Lower-Third

```text
┌────────────────────────────────────────────────────────────┐
│ HEADLINE → IMAGE → PRICE → CTA → LOGO                     │
└────────────────────────────────────────────────────────────┘
```

Reason:

The surface is extremely wide and short, so a horizontal banner row is
appropriate.

The logo is the lowest-priority element and can be degraded if the
available space requires it.

---

## Square Retail Kiosk

```text
┌──────────────────────────┐
│        HEADLINE          │
│                          │
│      PRODUCT IMAGE       │
│                          │
│          PRICE           │
│                          │
│           CTA            │
│                          │
│          LOGO            │
└──────────────────────────┘
```

Reason:

The square aspect ratio gives enough height and width for a centered
stacked presentation.

The surface is also touch-oriented, so the CTA must respect the minimum
tap target.

---

# 27. The Most Important System Behaviour

The engine should be understood as:

```text
ONE AD SPEC
     │
     ├──────────────┐
     │              │
     ▼              ▼
Portrait        Landscape
     │              │
     ▼              ▼
Stack           Split
     │              │
     └──────┬───────┘
            │
            ├───────────────┐
            ▼               ▼
        Broadcast         Kiosk
            │               │
            ▼               ▼
        Banner Row         Square
```

The content stays the same.

The surface changes.

The resolver changes the composition.

---

# 28. Problems We Faced During Development

This project involved several real debugging problems.

These problems were useful because they exposed the difference between:

```text
Correct engine coordinates
```

and

```text
Correct browser rendering
```

---

## Problem 1 --- Preview Container Was Too Narrow

The first major issue was caused by the browser layout around the
renderer.

The preview had a fixed/constrained parent width.

The resolver could request a preview around `700px` wide, while the
actual dashboard column had significantly less usable width.

This created a situation where:

```text
Resolver preview
       │
       │ 700px
       ▼
┌────────────────────────────┐
│       Preview Card         │
│                            │
│   Actual usable width      │
│        was smaller         │
└────────────────────────────┘
```

This caused visual squeezing/overflow in some surfaces.

### What we learned

The rendering container must not fight the dimensions produced by the
engine.

The issue was investigated at the CSS/container level rather than
changing the core resolver algorithm unnecessarily.

---

# 29. Problem 2 --- Safe Area Label Overlapped the Headline

The debug text:

```text
Safe Area Bounds
```

was initially rendered inside the safe-area visualization.

On smaller surfaces, the label could overlap the actual advertisement
content.

Example:

```text
Safe Area Bounds
Unleash Your Speed
```

The problem was not the safe-area calculation itself.

The problem was the **debug label's visual position**.

### Important distinction

```text
Safe-area rectangle = useful debugging information

Safe-area label = optional debugging decoration
```

The label should never cover real advertisement content.

Several positioning changes were tested, and the diagnostic-label
changes were rolled back when they did not produce the intended result.

The final approach should keep debug visualization separate from actual
content and should never allow the label to become part of the layout
calculation.

---

# 30. Problem 3 --- Logo Text Overflowed Its Container

The logo/branding element:

```text
FLAM SNEAKERS
```

could visually extend outside its small container in some previews.

This showed another important difference:

```text
Element bounds
        ≠
Text's actual rendered width
```

The resolver currently estimates element dimensions rather than
measuring the final browser text width.

This is a known limitation of the current implementation.

The correct long-term solution would be text-measurement-aware sizing,
but this was intentionally not turned into a large late-stage
architectural change.

---

# 31. Problem 4 --- CTA Width Looked Too Small in Portrait

The mobile portrait CTA was visually narrower than the desired
reference.

The landscape version had a wider button.

The issue was investigated as a sizing/rendering problem rather than by
adding a surface-specific CSS rule.

The important rule remains:

```text
Do not create:
if mobile → width X
if landscape → width Y
```

Instead, CTA dimensions should continue to come from the resolver's
element sizing and available width rules.

---

# 32. Problem 5 --- Broadcast Layout Became Visually Broken

During the later iterations, the broadcast lower-third preview showed
issues such as:

- CTA appearing too close to or over the image
- alignment looking disturbed
- elements appearing visually compressed
- branding not fitting cleanly

This was especially important because broadcast is a very different
aspect ratio.

The debugging focused on keeping the intended banner workflow:

```text
Headline
   →
Image
   →
Price
   →
CTA
   →
Logo
```

rather than treating the broadcast surface as a scaled mobile layout.

---

# 33. Problem 6 --- Changes Sometimes Made Things Worse

Several rendering changes were tested during the final debugging stage.

Examples included:

- Adding `boxSizing: border-box`
- Adding `maxWidth: 100%`
- Changing preview container behaviour
- Changing safe-area diagnostic label positioning
- Experimenting with preview sizing

When a change did not improve the output, it was rolled back.

This was an important engineering decision:

> A change that cannot be clearly shown to improve the system should not
> remain in the final code.

The resolver was kept protected from unnecessary late-stage changes
whenever possible.

---

# 34. Rollback Strategy

Because the project was close to completion, changes were handled
conservatively.

When a rendering experiment caused problems:

```text
New change
    │
    ▼
Run tests / inspect output
    │
    ├── Improvement
    │      ↓
    │   Keep it
    │
    └── No improvement / regression
           ↓
         Roll back
```

The core resolver was especially protected because changing the
algorithm late in the project could introduce new failures across all
four surfaces.

---

# 35. What We Learned From the Debugging

The biggest lesson was:

```text
Layout Engine
     ≠
Preview Container
```

There are two different coordinate systems involved.

### Engine side

The resolver thinks in terms of:

```text
surface width
surface height
safe area
element bounds
composition
priority
degradation
```

### Browser side

The renderer also has:

```text
preview width
preview height
CSS box model
parent padding
grid/flex constraints
scaling
```

A correct engine result can still look wrong if the browser container is
badly constrained.

This is why the final debugging had to inspect both the TypeScript
resolver and the CSS/container structure.

---

# 36. Testing

The layout engine is tested using Vitest.

Run:

```bash
npx vitest run
```

Current verification:
- 14 tests passed
- 0 tests failed
- 1 test file passed (`src/resolver.test.ts`)

The tests cover:
- safe-area calculation
- composition selection
- layout resolution
- priority-based degradation
- degradation levels
- overflow detection
- tap-target constraints
- minimum text-size constraints
- multi-surface resolution
- composition strategies

---

# 37. Manual Verification Checklist

For each surface:

```text
[ ] Correct surface dimensions
[ ] Correct safe-area bounds
[ ] Correct composition
[ ] Headline visible
[ ] Product image visible
[ ] Price visible when allowed
[ ] CTA visible and usable
[ ] Logo handled according to priority
[ ] No intentional overlap
[ ] No clipping outside usable area
[ ] Correct degradation behaviour
[ ] Telemetry matches actual resolver output
```

---

# 38. Current Architecture Strengths

The strongest parts of the project are:

### 1. One specification

The advertisement is defined once.

### 2. Surface-aware resolution

The engine reads the surface constraints.

### 3. Priority-based degradation

Lower-priority content can be reduced before higher-priority content.

### 4. Separate resolver and renderer

React is not responsible for deciding the layout.

### 5. Multiple compositions

The engine produces different arrangements for different aspect ratios.

### 6. Validation

The engine checks the resolved result instead of blindly rendering it.

### 7. Telemetry

The application exposes the engine's decisions so they can be inspected.

---

# 39. Current Limitations

The project intentionally remains a focused assignment implementation
rather than a complete production layout system.

Known limitations include:

### 1. Element sizing is still type-based

The resolver currently has explicit sizing rules for known element
types.

Adding a completely new element type would require extending the sizing
logic.

### 2. Square composition

The resolver can identify `square-grid` based on aspect ratio, but the
current positioning implementation falls back to the portrait-stack
strategy rather than having a fully independent grid algorithm.

### 3. Text measurement

Text dimensions are estimated.

The engine does not currently measure actual browser text width before
resolving the layout.

This is why text such as branding can require additional care.

### 4. No animation

Switching surfaces changes the layout immediately.

There is no transition animation between resolved layouts.

### 5. Preview scaling

The DOM preview is scaled for display.

The preview itself is not the real physical size of a 1920 × 250
broadcast surface.

---

# 40. Why These Limitations Are Acceptable

The assignment explicitly values:

- A clear algorithm
- Correct adaptation
- Priority handling
- Strong architecture
- Explainability

It does not require a full browser layout engine or a complete linear
programming solver.

The project therefore focuses on making the main resolution path
understandable:

```text
Spec
 ↓
Constraints
 ↓
Composition
 ↓
Sizing
 ↓
Positioning
 ↓
Validation
 ↓
Degradation
 ↓
Resolved Layout
 ↓
Rendering
```

---

# 41. AI Tools Used

AI usage was disclosed as required by the assignment.

## ChatGPT

**Primary AI tool used throughout the project.**

ChatGPT was mainly used for:

- Understanding the assignment
- Breaking the problem into modules
- Designing the resolution workflow
- Explaining layout algorithms
- Discussing priority and degradation
- Reviewing architecture
- Debugging ideas
- Analysing layout problems
- Planning tests
- Reviewing screenshots and rendered results
- Improving documentation
- Preparing the final README
- Explaining implementation decisions

ChatGPT was used as the main development and reasoning assistant.

## Antigravity

**Mainly used for debugging and applying/checking code changes inside
the development environment.**

Antigravity was used for:

- Inspecting the codebase
- Applying targeted changes
- Running the project
- Running tests
- Checking browser output
- Investigating rendering problems
- Testing CSS/container changes
- Rolling back unsuccessful experiments

The development process was therefore:

```text
Problem / requirement
        │
        ▼
     ChatGPT
  reasoning + plan
        │
        ▼
   Antigravity
 implementation +
 debugging/checking
        │
        ▼
 Browser/test result
        │
        ▼
     ChatGPT
 analysis + next step
```

No claim is made that AI independently designed or completed the
project. The final code and behaviour must remain understandable by the
developer.

---

# 42. Development Approach

The overall development approach was:

```text
Understand assignment
        │
        ▼
Define typed specification
        │
        ▼
Define surface profiles
        │
        ▼
Build resolver
        │
        ▼
Add composition strategies
        │
        ▼
Add validation
        │
        ▼
Add priority degradation
        │
        ▼
Connect React renderer
        │
        ▼
Add four-surface demo
        │
        ▼
Add telemetry
        │
        ▼
Test
        │
        ▼
Visual debugging
        │
        ▼
Rollback unsafe changes
        │
        ▼
Final verification
```

---

# 43. How to Run

Install dependencies:

```bash
npm install
```

Start the development server:

```bash
npm run dev
```

Open the local URL shown by Vite.

Then:

1. Select a surface.
2. Inspect the preview.
3. Inspect Engine Telemetry.
4. Switch between all four surfaces.
5. Compare the composition and element states.

Run the test suite:

```bash
npx vitest run
```

Type-check the project:

```bash
npx tsc --noEmit
```

---

# 44. How to Explain the Project in an Interview

A simple explanation is:

> "I define the advertisement once as a typed specification. I also
> define each target surface with its physical constraints. The resolver
> first removes the safe-area margins, then chooses a composition from
> the usable aspect ratio. It calculates element sizes, places the
> elements, and validates the result for overflow, overlap, text-size
> and tap-target constraints. If the layout is invalid, it degrades the
> lowest-priority element and tries again. Once a valid layout is found,
> it returns a ResolvedLayout. React does not make layout decisions; it
> only renders those resolved bounds to the DOM."

Then show:

```text
AdSpec
  +
SurfaceProfile
      │
      ▼
Constraint Resolver
      │
      ▼
Resolved Layout
      │
      ▼
DOM Renderer
```

That is the core idea of the entire project.

---

# 45. Final Project Summary

This project demonstrates a small adaptive layout engine that turns one
advertisement specification into different layouts for different
physical surfaces.

The central idea is:

> **Do not design four advertisements. Resolve one advertisement four
> different ways.**

The engine uses:

- Typed advertisement specifications
- Typed surface profiles
- Safe-area constraints
- Aspect-ratio-based compositions
- Element sizing
- Positioning strategies
- Priority-based degradation
- Layout validation
- A framework-independent TypeScript resolver
- A React DOM renderer
- Engine telemetry
- Automated tests
- Manual visual verification

The project also documents the real engineering problems encountered
during development, especially the difference between the resolver's
coordinate system and the browser preview container.

---

# 46. Final Architecture at a Glance

```text
                         USER
                          │
                          ▼
                 ┌─────────────────┐
                 │    App.tsx      │
                 │ Surface Picker  │
                 └────────┬────────┘
                          │
              ┌───────────┴───────────┐
              ▼                       ▼
        sampleAdSpec             SurfaceProfile
          spec.ts                surfaces.ts
              │                       │
              └───────────┬───────────┘
                          ▼
                 ┌─────────────────┐
                 │   resolver.ts   │
                 │                 │
                 │ Safe Area       │
                 │ Composition     │
                 │ Sizing          │
                 │ Positioning     │
                 │ Validation      │
                 │ Degradation     │
                 └────────┬────────┘
                          │
                          ▼
                 ┌─────────────────┐
                 │ ResolvedLayout  │
                 └────────┬────────┘
                          │
              ┌───────────┴───────────┐
              ▼                       ▼
      ┌───────────────┐       ┌───────────────┐
      │ render-dom    │       │   Telemetry   │
      │     .tsx      │       │    App.tsx    │
      └───────┬───────┘       └───────────────┘
              │
              ▼
       ┌───────────────┐
       │ Browser DOM   │
       │ Final Preview │
       └───────────────┘
```

---

## Final Principle

```text
CONTENT
   ↓
CONSTRAINTS
   ↓
RESOLUTION
   ↓
VALIDATION
   ↓
DEGRADATION
   ↓
RESOLVED LAYOUT
   ↓
RENDERING
```

That separation is the main architectural idea behind the project.
