import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { ClerkProvider } from '@clerk/clerk-react';
import { CLERK_PUBLISHABLE_KEY, isClerkEnabled, clerkAppearance } from './lib/clerk';
import { initPostHog } from './lib/posthog';
import { initSentry } from './lib/sentry';
import './index.css';
import App from './App';

// --- 初始化第三方服务 ---
initPostHog();
initSentry();

// --- 渲染应用 ---
const root = createRoot(document.getElementById('root')!);

function RootApp() {
  // Clerk 未配置时直接渲染，不包裹 Provider
  if (!isClerkEnabled) {
    return (
      <StrictMode>
        <App />
      </StrictMode>
    );
  }

  return (
    <StrictMode>
      <ClerkProvider
        publishableKey={CLERK_PUBLISHABLE_KEY}
        appearance={clerkAppearance}
        afterSignOutUrl="/"
      >
        <App />
      </ClerkProvider>
    </StrictMode>
  );
}

root.render(<RootApp />);
