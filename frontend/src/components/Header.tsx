import { AuthButton } from './AuthButton';

interface HeaderProps {
  storyCount: number;
  sseConnected: boolean;
}

export function Header({ storyCount, sseConnected }: HeaderProps) {
  return (
    <header className="header" id="app-header">
      <div className="header__inner">
        <div className="header__brand">
          <span className="header__logo">📖</span>
          <h1 className="header__title">
            吃瓜<span className="header__title-accent">日报</span>
          </h1>
        </div>

        <div className="header__stats">
          {sseConnected && (
            <div className="header__live-badge">
              <span className="header__live-dot" />
              实时
            </div>
          )}
          <span className="header__count">{storyCount} 条故事</span>
          <AuthButton />
        </div>
      </div>
    </header>
  );
}
