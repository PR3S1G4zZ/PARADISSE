import { BrowserRouter, NavLink, Route, Routes } from 'react-router-dom';
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
function NotFoundPage() {
  return <EmptyState title="Página no encontrada" description="La ruta solicitada no existe." />;
}

export { NavLink };

export function App({ initialPath }: { initialPath?: string } = {}) {
  if (initialPath && typeof window !== 'undefined' && window.location.pathname !== initialPath) {
    window.history.replaceState({}, '', initialPath);
  }

  return (
    <BrowserRouter>
      <PageLayout>
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/nosotros" element={<AboutPage />} />
          <Route path="/destinos" element={<DestinationsPage />} />
          <Route path="/destinos/:slug" element={<DestinationPage />} />
          <Route path="/guias/:slug/:category" element={<GuidePage />} />
          <Route path="/registro" element={<RegisterPage />} />
          <Route path="/iniciar-sesion" element={<LoginPage />} />
          <Route path="/pago" element={<PaymentPage />} />
          <Route path="*" element={<NotFoundPage />} />
        </Routes>
      </PageLayout>
    </BrowserRouter>
  );
}

export default App;
