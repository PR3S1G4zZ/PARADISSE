import { BrowserRouter, Route, Routes } from 'react-router-dom';
import { EmptyState } from '../shared/ui/EmptyState';
import { PageLayout } from '../shared/layout/PageLayout';
import { AboutPage } from '../features/about/AboutPage';
import { AuthPage } from '../features/auth/AuthPage';
import { AuthProvider } from '../features/auth/AuthProvider';
import { CheckoutPage } from '../features/checkout/CheckoutPage';
import { DestinationPage } from '../features/destinations/DestinationPage';
import { DestinationsPage } from '../features/destinations/DestinationsPage';
import { GuidePage } from '../features/guides/GuidePage';
import { HomePage } from '../features/home/HomePage';
import { NavegacionProvider } from '../features/navigation/NavigationContext';

export type RoutePath =
  | '/'
  | '/nosotros'
  | '/destinos'
  | `/destinos/${string}`
  | `/guias/${string}/${string}`
  | '/registro'
  | '/iniciar-sesion'
  | '/pago';

function NotFoundPage() {
  return <EmptyState title="Página no encontrada" description="La ruta solicitada no existe." />;
}

export function App({ initialPath }: { initialPath?: string } = {}) {
  if (initialPath && typeof window !== 'undefined' && window.location.pathname !== initialPath) {
    window.history.replaceState({}, '', initialPath);
  }

  return (
    <BrowserRouter>
      <AuthProvider>
        <NavegacionProvider>
          <PageLayout>
            <Routes>
              <Route path="/" element={<HomePage />} />
              <Route path="/nosotros" element={<AboutPage />} />
              <Route path="/destinos" element={<DestinationsPage />} />
              <Route path="/destinos/:slug" element={<DestinationPage />} />
              <Route path="/guias/:slug/:category" element={<GuidePage />} />
              <Route path="/registro" element={<AuthPage mode="register" />} />
              <Route path="/iniciar-sesion" element={<AuthPage mode="login" />} />
              <Route path="/pago" element={<CheckoutPage />} />
              <Route path="*" element={<NotFoundPage />} />
            </Routes>
          </PageLayout>
        </NavegacionProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;
