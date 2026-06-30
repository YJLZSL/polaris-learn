import { Navigate, Outlet } from 'react-router-dom';
import { useSession } from '@/components/providers/SessionProvider';

/* Task 18.6: starfield twinkle points (fixed positions/delays) */
const STARS = [
  { top: '8%', left: '12%', size: 2, delay: '0s' },
  { top: '18%', left: '78%', size: 3, delay: '0.6s' },
  { top: '32%', left: '42%', size: 2, delay: '1.2s' },
  { top: '48%', left: '88%', size: 2, delay: '0.3s' },
  { top: '62%', left: '18%', size: 3, delay: '0.9s' },
  { top: '72%', left: '62%', size: 2, delay: '1.5s' },
  { top: '85%', left: '32%', size: 2, delay: '0.4s' },
  { top: '12%', left: '52%', size: 2, delay: '1.8s' },
  { top: '55%', left: '8%', size: 3, delay: '1.1s' },
  { top: '88%', left: '72%', size: 2, delay: '0.2s' },
];

export default function PublicOnlyRoute() {
  const { status } = useSession();

  if (status === 'loading') return null;
  if (status === 'authenticated') return <Navigate to="/home" replace />;

  return (
    <div className="relative min-h-screen flex items-center justify-center bg-gradient-to-br from-indigo-950 via-background to-primary/20 p-4 overflow-hidden">
      {/* Task 18.6: starfield */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        {STARS.map((star, i) => (
          <span
            key={i}
            className="absolute rounded-full bg-white animate-twinkle"
            style={{
              top: star.top,
              left: star.left,
              width: star.size,
              height: star.size,
              animationDelay: star.delay,
            }}
          />
        ))}
        <div className="absolute top-1/4 left-1/4 w-72 h-72 bg-indigo-500/10 rounded-full blur-3xl" />
        <div className="absolute bottom-1/4 right-1/4 w-80 h-80 bg-purple-500/10 rounded-full blur-3xl" />
      </div>
      <div className="relative z-10 w-full max-w-md">
        <Outlet />
      </div>
    </div>
  );
}