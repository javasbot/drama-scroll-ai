import { Feed } from './components/Feed';
import { Header } from './components/Header';
import { useFeedStore } from './stores/feedStore';
import { Sentry, isSentryEnabled } from './lib/sentry';

function AppContent() {
  const storyCount = useFeedStore((s) => s.stories.length);
  const sseConnected = useFeedStore((s) => s.sseConnected);

  return (
    <div className="app">
      <Header storyCount={storyCount} sseConnected={sseConnected} />
      <Feed />
    </div>
  );
}

function App() {
  // Sentry 错误边界包裹
  if (isSentryEnabled) {
    return (
      <Sentry.ErrorBoundary
        fallback={({ error }) => (
          <div className="feed-error">
            <span className="feed-error__icon">😵</span>
            <p className="feed-error__text">
              出了点问题：{(error as Error)?.message || '未知错误'}
            </p>
            <button className="feed-error__retry" onClick={() => window.location.reload()}>
              刷新页面
            </button>
          </div>
        )}
      >
        <AppContent />
      </Sentry.ErrorBoundary>
    );
  }

  return <AppContent />;
}

export default App;
