import { HashRouter } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { SessionProvider } from '@/components/providers/SessionProvider';
import ServiceWorkerRegister from '@/components/providers/ServiceWorkerRegister';
import ElectronDetector from '@/components/providers/ElectronDetector';
import AppRoutes from '@/routes';

function App() {
  return (
    <SessionProvider>
      <HashRouter>
        <AppRoutes />
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
    </SessionProvider>
  );
}

export default App;
