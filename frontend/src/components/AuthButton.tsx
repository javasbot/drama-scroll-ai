import { useUser, SignInButton, UserButton } from '@clerk/clerk-react';
import { isClerkEnabled } from '../lib/clerk';

export function AuthButton() {
  if (!isClerkEnabled) return null;

  return <AuthButtonInner />;
}

function AuthButtonInner() {
  const { isSignedIn, isLoaded } = useUser();

  if (!isLoaded) return null;

  if (isSignedIn) {
    return (
      <div className="auth-button">
        <UserButton
          afterSignOutUrl="/"
          appearance={{
            elements: {
              avatarBox: { width: '28px', height: '28px' },
            },
          }}
        />
      </div>
    );
  }

  return (
    <SignInButton mode="modal">
      <button className="auth-login-btn" id="auth-login">
        登录
      </button>
    </SignInButton>
  );
}
