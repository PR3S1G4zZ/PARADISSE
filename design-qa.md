# Design QA: checkout sin sesión

## Comparison target

- Source visual truth: screenshot attached to Browser Comment 1 by the user, showing `/pago` in the unauthenticated state. The source is an inline conversation attachment and has no filesystem path.
- Implementation: local route `http://127.0.0.1:4173/pago`, captured in the Codex in-app browser after the change. The browser capture is inline in the implementation turn and has no filesystem path.
- Viewport: 553 × 708 CSS px, matching the annotated browser viewport.
- Density: browser screenshot density was not exposed by the CUA surface; comparison used the same CSS viewport and did not apply a pixel-density transform.
- State: unauthenticated checkout. The local browser retained one previously selected experience, so dynamic summary content differs from the source crop; layout, hierarchy, controls, and messaging were compared independently of that data difference.

## Full-view comparison

The implementation keeps the existing dark PARADISSE shell and warm paper background, while replacing the tall undifferentiated card content with a tighter reservation hierarchy. The title is now rendered through the same semantic header structure as the authenticated checkout, the selected-plan context is visible before authentication, and both authentication paths are presented as full-width mobile actions. The card remains scrollable within the page without clipping the footer or creating horizontal overflow.

## Focused-region comparison

The focused region was the annotated checkout card. The source had excessive vertical whitespace, an unstyled unauthenticated heading, a low-emphasis text-only secondary action, and no visible summary of the local selection. The revised capture shows a consistent serif heading, compact supporting copy, a highlighted selection summary with a real Feather icon, a primary CTA with directional icon, an outlined secondary action, and a local-storage reassurance note.

## Required fidelity surfaces

- Fonts and typography: the unauthenticated heading now uses the checkout display treatment (`Georgia` fallback) instead of inheriting the browser default. Body copy stays in the existing Montserrat-based system, with reduced and consistent line-height and spacing.
- Spacing and layout: the card uses a compact vertical rhythm on mobile and a two-column editorial arrangement from 768 px upward. Actions have practical mobile tap targets and the previous empty gap is removed.
- Colors and tokens: existing PARADISSE olive, gold, ink, and paper tokens remain the source of the palette. The summary and note use restrained token-based mixes rather than new brand colors.
- Image quality and asset fidelity: no new image asset was required for this screen; the existing logo and footer imagery remain untouched. The new visual mark is a `react-icons/fi` icon, not a custom SVG or CSS drawing.
- Copy and content: the existing auth requirement and local-only confirmation promise remain intact. The new summary distinguishes an empty local plan from a plan containing selected experiences.
- Icons: the check-circle, arrow, and lock icons use the existing Feather icon package, are marked decorative, and align with the established interface language.
- States and interactions: unauthenticated markup contains no checkout form or payment controls. `Crear una cuenta` routes to `/registro`, `Ya tengo una cuenta` routes to `/iniciar-sesion`, and the local plan remains available to the page. The authenticated form keeps its local confirmation flow and gains standard autocomplete hints.
- Accessibility: the existing labelled region and heading relationship are preserved; the secondary link now has an explicit focus treatment; labels and required inputs remain unchanged; the new icon graphics are hidden from assistive technology.

## Comparison history

1. Initial source comparison identified the main drift: excessive whitespace, inconsistent heading styling, no visible plan context, and a weak secondary action.
2. The implementation added the shared checkout header structure, reservation summary, action hierarchy, responsive layout, focus treatment, and autocomplete attributes.
3. Lightning CSS initially reported an invalid empty selector caused by one extra closing brace in `checkout.css`. Removing that brace was the only syntax fix; the revised build completed successfully.
4. Post-fix browser capture at 553 × 708 showed no actionable P0, P1, or P2 visual findings. The remaining dynamic difference is expected because the local browser contains a selected experience.

## Verification evidence

- Focused tests: 5 test files, 32 tests passed.
- Production build: `pnpm run build` passed with `tsc -b` and Vite.
- Browser interactions: both authentication links were exercised; routes reached `/registro` and `/iniciar-sesion` before returning to `/pago`.
- Browser console: no error or warning entries after the final capture.
- Formatting check: `git diff --check` completed without whitespace errors; Git only reported its existing LF/CRLF normalization notices.

## Implementation checklist

- [x] Preserve existing `/pago`, `/registro`, and `/iniciar-sesion` routes.
- [x] Keep the unauthenticated state free of payment and contact controls.
- [x] Expose local selection context before authentication.
- [x] Make actions clear and touch-friendly at the annotated viewport.
- [x] Preserve local checkout semantics and add focused regression tests.
- [x] Verify rendered output, interactions, console, tests, and production build.

## Follow-up polish

- [P3] A future pass could provide an exact desktop reference for the checkout state to tune the 768 px two-column breakpoint against a source frame.

final result: passed

## Iteration: contraste e iconos de las tarjetas de municipios

### Comparison target

- Source visual truth: the two inline browser captures attached to the user's comments on `/`, showing the destination grid at the annotated mobile viewport. The captures have no filesystem path.
- Implementation: local route `http://127.0.0.1:4173/`, captured in the Codex in-app browser after the change. The capture has no filesystem path.
- Viewport: 553 × 708 CSS px, matching the annotated browser viewport.
- Density: browser screenshot density was not exposed by the CUA surface; comparison used the same CSS viewport without a pixel-density transform.
- State: home page scrolled to the “Municipios del Suroeste” section, with the eight destination cards visible.

### Focused-region comparison

The source showed the first four cards with light copy over variable photography and a white circular control whose pin shape was not visually legible. The revised capture keeps the same eight-card composition and destinations, but places the scrim above each image, strengthens the bottom contrast, and uses brighter semibold descriptions with a stronger text shadow. The featured controls now use a real `FiMapPin` icon inside a gold circular action, so the Jericó control reads as a location/detail affordance instead of an empty circle.

### Required fidelity surfaces

- Layout: the four-column mobile grid, featured/compact card proportions, image crops, spacing, and footer remain unchanged.
- Contrast and typography: the existing white, olive, and gold direction remains intact; only the scrim stacking, copy weight/opacity, and shadow were adjusted for legibility.
- Icons and assets: the featured action uses the existing Feather icon library; no CSS-drawn pin, handcrafted SVG, or new image asset was introduced.
- Interactions: the four featured links retain their accessible municipality-specific labels and continue to route to `/destinos/:slug`; compact cards retain their “Planear visita” action and now include the municipality in their accessible name.
- Accessibility: the map-pin graphics remain decorative inside links that expose explicit `aria-label` values, and the existing focus-visible outline is preserved.
- Responsive behavior: mobile copy receives a small readability increase and the featured control remains proportionate to the card at the annotated viewport.

### Verification evidence

- TDD regression: `src/features/home/HomePage.test.tsx` failed before the icon change and passed after it.
- Focused tests: 2 test files, 22 tests passed (`HomePage.test.tsx` and `router.test.tsx`) with one worker and bounded timeouts.
- Production build: `pnpm run build` passed with `tsc -b` and Vite.
- Browser interaction: the accessible Jericó action reached `/destinos/jerico`; the browser was returned to the home section afterward.
- Browser console: no error or warning entries after the final capture.
- Formatting check: `git diff --check` reported no whitespace errors; only existing LF/CRLF normalization notices were emitted.

### Implementation checklist

- [x] Put the card scrim above the image and the card content above the scrim.
- [x] Improve title and description readability without changing the copy or card composition.
- [x] Replace the ambiguous featured circle graphic with a real location icon.
- [x] Preserve destination routes, accessible labels, responsive sizing, and focus behavior.
- [x] Add and pass a focused regression test.
- [x] Verify the annotated viewport, primary card interaction, console, tests, and production build.

### Scope note from independent review

The independent review also surfaced two pre-existing HomePage behaviors outside this visual iteration: the home section intentionally renders the eight highlighted municipalities rather than the full catalogue, and it has no visible registration CTA. They were left unchanged to preserve the supplied composition and avoid mixing a separate navigation/conversion change into this targeted correction.

### Follow-up polish

- [P3] If a larger desktop reference is supplied later, tune the featured-card scrim stops and desktop icon size against that frame; the annotated mobile state is now verified.

final result: passed
