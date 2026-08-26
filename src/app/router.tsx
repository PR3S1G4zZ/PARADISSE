import { useEffect, useState, type ComponentType, type ReactNode } from 'react';
import { EmptyState } from '../shared/ui/EmptyState';
import { PageLayout } from '../shared/layout/PageLayout';

export type RoutePath =
  | '/'
  | '/nosotros'
  | '/destinos'
  | `/destinos/${string}`
  | `/guias/${string}/${string}`
  | '/registro'
  | '/iniciar-sesion'
  | '/pago';

type RouteDefinition = { matches: (path: string) => boolean; page: ComponentType };

function PlaceholderPage({ title }: { title: string }) {
  return <EmptyState title={title} description="Esta sección estará disponible próximamente." />;
}

function HomePage() { return <PlaceholderPage title="Bienvenido a PARADISSE" />; }
function AboutPage() { return <PlaceholderPage title="Nosotros" />; }
function DestinationsPage() { return <PlaceholderPage title="Destinos" />; }
function DestinationPage() { return <PlaceholderPage title="Detalle del destino" />; }
function GuidePage() { return <PlaceholderPage title="Guía de viaje" />; }
function RegisterPage() { return <PlaceholderPage title="Regístrate" />; }
function LoginPage() { return <PlaceholderPage title="Iniciar sesión" />; }
function PaymentPage() { return <PlaceholderPage title="Pago" />; }

const routes: readonly RouteDefinition[] = [
  { matches: (path) => path === '/', page: HomePage },
  { matches: (path) => path === '/nosotros', page: AboutPage },
  { matches: (path) => path === '/destinos', page: DestinationsPage },
  { matches: (path) => /^\/destinos\/[^/]+$/.test(path), page: DestinationPage },
  { matches: (path) => /^\/guias\/[^/]+\/[^/]+$/.test(path), page: GuidePage },
  { matches: (path) => path === '/registro', page: RegisterPage },
  { matches: (path) => path === '/iniciar-sesion', page: LoginPage },
  { matches: (path) => path === '/pago', page: PaymentPage },
];

function resolvePage(path: string): ReactNode {
  const route = routes.find(({ matches }) => matches(path));
  if (!route) return <EmptyState title="Página no encontrada" description="La ruta solicitada no existe." />;
  const Page = route.page;
  return <Page />;
}

export function NavLink({ to, children }: { to: RoutePath; children: ReactNode }) {
  const currentPath = typeof window === 'undefined' ? '/' : window.location.pathname;
  const active = currentPath === to;
  return <a href={to} aria-current={active ? 'page' : undefined}>{children}</a>;
}

export function App({ initialPath }: { initialPath?: string } = {}) {
  const [path, setPath] = useState(initialPath ?? (typeof window === 'undefined' ? '/' : window.location.pathname));

  useEffect(() => {
    if (initialPath) return;
    const onPopState = () => setPath(window.location.pathname);
    window.addEventListener('popstate', onPopState);
    return () => window.removeEventListener('popstate', onPopState);
  }, [initialPath]);

  return <PageLayout>{resolvePage(path)}</PageLayout>;
}

export default App;
