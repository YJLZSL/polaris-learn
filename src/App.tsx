import { useEffect, type ReactNode } from 'react';
import { HashRouter } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { SplashScreen as CapacitorSplashScreen } from '@capacitor/splash-screen';
import ErrorBoundary from '@/components/shell/ErrorBoundary';
import { SessionProvider, useSession } from '@/components/providers/SessionProvider';
import ServiceWorkerRegister from '@/components/providers/ServiceWorkerRegister';
import ElectronDetector from '@/components/providers/ElectronDetector';
import { useSplashScreen } from '@/components/shell/SplashScreen';
import { isCapacitor } from '@/lib/platform';
import AppRoutes from '@/routes';

function SplashGate({ children }: { children: ReactNode }) {
  const { status } = useSession();
  const { SplashScreen, markReady } = useSplashScreen({ minDuration: 1800 });

  useEffect(() => {
    if (status !== 'loading') {
      markReady();
    }
  }, [status, markReady]);

  return (
    <>
      {children}
      {SplashScreen}
    </>
  );
}

function NativeSplashController() {
  useEffect(() => {
    if (isCapacitor()) {
      CapacitorSplashScreen.hide().catch((err) => {
        console.error('[App] Failed to hide native splash screen:', err);
      });
    }
  }, []);

  return null;
}

function App() {
  return (
    <ErrorBoundary>
      <SessionProvider>
        <HashRouter>
          <SplashGate>
            <AppRoutes />
          </SplashGate>
        </HashRouter>
        <Toaster
          position="top-center"
          toastOptions={{
            duration: 3000,
            style: {
              background: '#1e293b',
              color: '#f1f5f9',
              borderRadius: '12px',
              fontSize: '14px',
            },
          }}
        />
        {/* PWA Service Worker Registration */}
        <ServiceWorkerRegister />
        {/* Electron environment detection */}
        <ElectronDetector />
        {/* Native splash screen hide timing */}
        <NativeSplashController />
      </SessionProvider>
    </ErrorBoundary>
  );
}

export default App;
