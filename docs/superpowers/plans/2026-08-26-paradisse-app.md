# PARADISSE APP Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the Figma-derived PARADISSE APP as a responsive, functional React + TypeScript tourism application with local persistence.

**Architecture:** Feature modules own destination content, guides, local authentication, visit plans, and checkout. Shared layout and UI components compose each route; a typed `StorageAdapter` is the only code allowed to touch browser persistence, so it can later be exchanged for HTTP services.

**Tech Stack:** Vite, React, TypeScript, React Router, CSS Modules/global tokens, Vitest, Testing Library and jsdom.

**Spec:** `docs/superpowers/specs/2026-08-26-paradisse-app-design.md`

## Global Constraints

- Use React + TypeScript; do not introduce Tailwind.
- Preserve the Figma journeys: explore, municipality, guide, access, checkout.
- Persist session, favorites, visit plan and checkout only through a typed local adapter.
- No real payment or external authentication; visible copy must say when an action is local.
- Use responsive grid/flex layouts rather than exported absolute coordinates.
- Add a failing test before each production behavior.

---

## File structure

```text
src/
  app/{App.tsx,router.tsx}
  data/{municipalities.ts,guides.ts}
  features/
    auth/{auth-service.ts,auth-service.test.ts,AuthPage.tsx}
    checkout/{checkout-service.ts,CheckoutPage.tsx}
    destinations/{destination-service.ts,DestinationPage.tsx,DestinationsPage.tsx}
    guides/{GuidePage.tsx}
    visit-plan/{plan-service.ts,plan-service.test.ts}
  shared/{layout,ui,lib,types}
  styles/{tokens.css,global.css}
```

### Task 1: Create the React testable foundation

**Files:**
- Create: `package.json`, `vite.config.ts`, `tsconfig.json`, `index.html`
- Create: `src/main.tsx`, `src/app/App.tsx`, `src/styles/tokens.css`, `src/styles/global.css`
- Create: `src/shared/types/domain.ts`, `src/shared/lib/storage.ts`, `src/shared/lib/storage.test.ts`

**Interfaces:**
- Produces `StorageAdapter` with `get<T>(key, fallback): T`, `set<T>(key, value): void`, and `remove(key): void`.
- Produces `Municipality`, `Experience`, `Guide`, `UserSession` and `VisitPlan` domain types.

- [ ] **Step 1: Write the failing storage test**

```ts
import { createStorageAdapter } from './storage';

test('returns fallback and recovers from malformed JSON', () => {
  localStorage.setItem('broken', '{');
  expect(createStorageAdapter().get('broken', [])).toEqual([]);
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npm test -- storage.test.ts`

Expected: FAIL because the project and `createStorageAdapter` do not exist.

- [ ] **Step 3: Implement the foundation**

```ts
export const createStorageAdapter = (): StorageAdapter => ({
  get: <T>(key: string, fallback: T): T => {
    try { return JSON.parse(localStorage.getItem(key) ?? '') as T; }
    catch { return fallback; }
  },
  set: <T>(key: string, value: T) => localStorage.setItem(key, JSON.stringify(value)),
  remove: (key: string) => localStorage.removeItem(key),
});
```

Configure Vite, Vitest and jsdom; import global styles from `main.tsx`.

- [ ] **Step 4: Run tests and type checking**

Run: `npm test -- storage.test.ts && npm run build`

Expected: PASS and a production build without TypeScript errors.

- [ ] **Step 5: Commit**

```bash
git add package.json package-lock.json vite.config.ts tsconfig.json index.html src
git commit -m "feat: bootstrap typed React application"
```

### Task 2: Add local session and visit-plan services

**Files:**
- Create: `src/features/auth/auth-service.ts`, `src/features/auth/auth-service.test.ts`
- Create: `src/features/visit-plan/plan-service.ts`, `src/features/visit-plan/plan-service.test.ts`

**Interfaces:**
- Consumes `StorageAdapter`, `UserSession`, `VisitPlan` from Task 1.
- Produces `registerLocal`, `signInLocal`, `signOut`, `getSession`, `toggleFavorite`, `addExperience`, `getPlan`.

- [ ] **Step 1: Write failing behavior tests**

```ts
test('register creates a persisted authenticated session', () => {
  const service = createAuthService(memoryStorage);
  expect(service.registerLocal({ name: 'Ana', email: 'ana@example.com', password: 'secreto1' }).email)
    .toBe('ana@example.com');
});

test('adding the same favorite twice removes it', () => {
  const plan = createPlanService(memoryStorage);
  plan.toggleFavorite('jardin');
  plan.toggleFavorite('jardin');
  expect(plan.getPlan().favorites).toEqual([]);
});
```

- [ ] **Step 2: Verify the tests fail**

Run: `npm test -- auth-service.test.ts plan-service.test.ts`

Expected: FAIL because the feature services do not exist.

- [ ] **Step 3: Implement minimal services**

```ts
const SESSION_KEY = 'paradisse.session';
export const createAuthService = (storage: StorageAdapter) => ({
  registerLocal: ({ name, email }: RegisterInput): UserSession => {
    const session = { id: crypto.randomUUID(), name, email };
    storage.set(SESSION_KEY, session); return session;
  },
  getSession: () => storage.get<UserSession | null>(SESSION_KEY, null),
  signOut: () => storage.remove(SESSION_KEY),
});
```

Implement plan mutation as immutable state persisted under `paradisse.plan`.

- [ ] **Step 4: Verify the feature suite passes**

Run: `npm test -- auth-service.test.ts plan-service.test.ts`

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/features/auth src/features/visit-plan src/shared/types
git commit -m "feat: add local session and visit plan services"
```

### Task 3: Build application shell and routes

**Files:**
- Create: `src/app/router.tsx`, `src/app/router.test.tsx`
- Create: `src/shared/layout/{SiteHeader.tsx,SiteFooter.tsx,PageLayout.tsx}`
- Create: `src/shared/ui/{Button.tsx,EmptyState.tsx}`

**Interfaces:**
- Consumes route page components produced by Tasks 4–7.
- Produces routes `/`, `/nosotros`, `/destinos`, `/destinos/:slug`, `/guias/:slug/:category`, `/registro`, `/iniciar-sesion`, `/pago`.

- [ ] **Step 1: Write a failing route test**

```tsx
test('renders a recovery view for an unknown path', () => {
  render(<App initialPath="/inexistente" />);
  expect(screen.getByRole('heading', { name: /página no encontrada/i })).toBeInTheDocument();
});
```

- [ ] **Step 2: Verify it fails**

Run: `npm test -- router.test.tsx`

Expected: FAIL because `App` does not route requests.

- [ ] **Step 3: Implement semantic shared navigation**

```tsx
<nav aria-label="Principal">
  <NavLink to="/">Inicio</NavLink>
  <NavLink to="/nosotros">Nosotros</NavLink>
  <NavLink to="/destinos">Destinos</NavLink>
  <NavLink to="/registro">Regístrate</NavLink>
</nav>
```

Use a single `PageLayout` to preserve consistent header, footer and max-width.

- [ ] **Step 4: Verify the shell**

Run: `npm test -- router.test.tsx && npm run build`

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/app src/shared/layout src/shared/ui
git commit -m "feat: add Paradisse navigation and routes"
```

### Task 4: Implement discovery and destinations

**Files:**
- Create: `src/data/municipalities.ts`
- Create: `src/features/destinations/{destination-service.ts,DestinationsPage.tsx,DestinationPage.tsx,DestinationCard.tsx,destination-service.test.ts}`

**Interfaces:**
- Produces `listMunicipalities(query?: string): Municipality[]` and `getMunicipality(slug): Municipality | undefined`.
- Uses `toggleFavorite` from Task 2.

- [ ] **Step 1: Write failing catalog tests**

```ts
test('finds Jardín without treating case as significant', () => {
  expect(listMunicipalities('JARDÍN').map(({ slug }) => slug)).toContain('jardin');
});

test('returns undefined for an absent municipality', () => {
  expect(getMunicipality('ausente')).toBeUndefined();
});
```

- [ ] **Step 2: Verify they fail**

Run: `npm test -- destination-service.test.ts`

Expected: FAIL because catalog functions are absent.

- [ ] **Step 3: Implement data-driven screens**

```ts
export const listMunicipalities = (query = '') =>
  municipalities.filter(({ name }) => normalize(name).includes(normalize(query)));
```

Use `DestinationCard` in both the home highlights and `/destinos`; use the
detail route for municipality summary, experiences, guides and plan action.

- [ ] **Step 4: Verify catalog and route tests**

Run: `npm test -- destination-service.test.ts router.test.tsx`

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/data src/features/destinations
git commit -m "feat: add interactive destination discovery"
```

### Task 5: Implement guides and planning flow

**Files:**
- Create: `src/data/guides.ts`, `src/features/guides/{GuidePage.tsx,GuideCard.tsx}`
- Modify: `src/features/destinations/DestinationPage.tsx`
- Test: `src/features/guides/GuidePage.test.tsx`

**Interfaces:**
- Consumes municipality and plan services.
- Produces category pages for `cultura-historia` and `gastronomia` and an add-to-plan action.

- [ ] **Step 1: Write the failing guide interaction test**

```tsx
test('adds a guide experience to the visit plan', async () => {
  render(<GuidePage municipalitySlug="jardin" category="gastronomia" />);
  await userEvent.click(screen.getByRole('button', { name: /añadir.*plan/i }));
  expect(screen.getByText(/agregada a tu visita/i)).toBeInTheDocument();
});
```

- [ ] **Step 2: Verify it fails**

Run: `npm test -- GuidePage.test.tsx`

Expected: FAIL because no guide page exists.

- [ ] **Step 3: Implement guide categories**

Render each typed guide card from `guides.ts`, and call `addExperience` to
persist the selected experience. Link cards from municipality detail using
`/guias/:slug/:category`.

- [ ] **Step 4: Verify the guide flow**

Run: `npm test -- GuidePage.test.tsx plan-service.test.ts`

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/data/guides.ts src/features/guides src/features/destinations/DestinationPage.tsx
git commit -m "feat: connect guides to visit planning"
```

### Task 6: Implement access flows with validation

**Files:**
- Create: `src/features/auth/{validators.ts,AuthPage.tsx,AuthPage.test.tsx}`

**Interfaces:**
- Consumes `registerLocal` and `getSession`.
- Produces `validateRegistration(input): ValidationErrors` and registration/login forms.

- [ ] **Step 1: Write failing form validation test**

```tsx
test('prevents registration with an invalid email', async () => {
  render(<AuthPage mode="register" />);
  await userEvent.type(screen.getByLabelText(/correo/i), 'invalido');
  await userEvent.click(screen.getByRole('button', { name: /crear cuenta/i }));
  expect(screen.getByText(/correo válido/i)).toBeInTheDocument();
});
```

- [ ] **Step 2: Verify it fails**

Run: `npm test -- AuthPage.test.tsx`

Expected: FAIL because the form is missing.

- [ ] **Step 3: Implement controlled forms**

```ts
export const validateEmail = (email: string) =>
  /^\S+@\S+\.\S+$/.test(email) ? undefined : 'Ingresa un correo válido.';
```

Validate name, email and passwords before calling the local auth service;
redirect an authenticated user to `/pago` when they came from the plan flow.

- [ ] **Step 4: Verify access behavior**

Run: `npm test -- AuthPage.test.tsx auth-service.test.ts`

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/features/auth
git commit -m "feat: add validated local access flows"
```

### Task 7: Implement local checkout and responsive visual system

**Files:**
- Create: `src/features/checkout/{checkout-service.ts,CheckoutPage.tsx,checkout-service.test.ts}`
- Modify: `src/styles/{tokens.css,global.css}` and all route page CSS modules

**Interfaces:**
- Consumes `getSession` and `getPlan`.
- Produces `confirmLocalCheckout(method): LocalCheckoutConfirmation`.

- [ ] **Step 1: Write failing checkout test**

```ts
test('confirms a local reservation with the selected method', () => {
  const result = createCheckoutService(memoryStorage).confirmLocalCheckout('tarjeta');
  expect(result.method).toBe('tarjeta');
  expect(result.status).toBe('local-confirmed');
});
```

- [ ] **Step 2: Verify it fails**

Run: `npm test -- checkout-service.test.ts`

Expected: FAIL because checkout service is absent.

- [ ] **Step 3: Implement checkout and Figma-aligned CSS**

Implement a payment-method selector and a confirmation that explicitly says
`Confirmación local: no se realizó ningún cobro`. Apply tokens such as
`--color-olive`, `--color-gold`, `--color-ink`, `--radius-card` and responsive
breakpoints at 768px and 1120px. Use grid for municipality cards and flex for
navigation; add keyboard-visible focus styles.

- [ ] **Step 4: Verify production quality**

Run: `npm test && npm run build`

Expected: every test passes and Vite completes the build.

- [ ] **Step 5: Manually verify key routes**

Run: `npm run dev -- --host 127.0.0.1`

Check desktop and 375px widths for `/`, `/destinos`, `/destinos/jardin`,
`/registro`, `/iniciar-sesion`, and `/pago`; verify links, validation, local
session and checkout confirmation.

- [ ] **Step 6: Commit**

```bash
git add src
git commit -m "feat: complete local checkout and responsive visual system"
```

## Plan self-review

- Spec coverage: Tasks 1–2 implement types and persistence; Tasks 3–5 implement every exploration and guide journey; Tasks 6–7 implement access, local payment, errors, responsive design and verification.
- Placeholder scan: no deferred requirements or unspecified behaviors remain.
- Type consistency: services consume `StorageAdapter`; routes use the declared slugs and category names; checkout consumes plan/session from prior tasks.

### Task 8: Implement Home, Nosotros and route integration

**Files:**
- Create: `src/features/home/HomePage.tsx`, `src/features/home/home.css`
- Create: `src/features/about/AboutPage.tsx`, `src/features/about/about.css`
- Modify: `src/app/router.tsx`, `src/app/router.test.tsx`

**Interfaces:**
- Consumes exported pages from Tasks 4–7 and `municipalities`/`guides` data.
- Produces fully wired routes for every screen in the specification, including Inicio and Nosotros.

- [ ] **Step 1: Write failing integration tests**

```tsx
test.each([
  ['/', /donde cada viaje es una aventura/i],
  ['/nosotros', /quiénes somos/i],
  ['/destinos', /municipios del suroeste/i],
  ['/destinos/jardin', /jardín/i],
  ['/guias/jardin/gastronomia', /gastronomía/i],
  ['/registro', /crear tu cuenta/i],
  ['/iniciar-sesion', /bienvenido de nuevo/i],
  ['/pago', /plan de visita/i],
])('renders a real screen for %s', (path, heading) => {
  render(<App initialPath={path} />);
  expect(screen.getByText(heading)).toBeInTheDocument();
});
```

- [ ] **Step 2: Verify tests fail**

Run: `npm test -- router.test.tsx`

Expected: FAIL because placeholders still render for several routes.

- [ ] **Step 3: Implement and wire real pages**

Build Home from the Figma hero, regional facts, municipality highlights, map
panel and footer CTA. Build Nosotros from mission, vision and differentiators.
Replace every placeholder route element with the exported feature component;
keep the existing route paths and shared layout.

- [ ] **Step 4: Verify all route integration**

Run: `npm test -- router.test.tsx && npm test && npm run build`

Expected: all tests and production build pass.

- [ ] **Step 5: Commit**

```bash
git add src/features/home src/features/about src/app/router.tsx src/app/router.test.tsx
git commit -m "feat: wire complete Paradisse screen flows"
```
