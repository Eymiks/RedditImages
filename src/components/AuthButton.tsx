import { LogIn, LogOut } from "lucide-react";
import { hasRedditClientId } from "../api/auth";
import { useAuth } from "../store/auth";

export function AuthButton() {
  const { session, login, logout, authError, isBooting } = useAuth();
  const canLogin = hasRedditClientId();

  if (isBooting) {
    return <span className="text-xs text-moss-100/70">Connexion...</span>;
  }

  if (!session) {
    return (
      <div className="flex flex-col items-end gap-1">
        <button
          className={`inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-semibold shadow-glow active:scale-95 ${
            canLogin ? "bg-orange-500 text-white" : "bg-white/10 text-moss-100/55"
          }`}
          disabled={!canLogin}
          onClick={() => void login()}
          type="button"
        >
          <LogIn size={17} />
          Reddit
        </button>
        {!canLogin ? (
          <span className="max-w-44 text-right text-xs text-moss-100/55">Mode public</span>
        ) : null}
        {authError ? <span className="max-w-48 text-right text-xs text-red-200">{authError}</span> : null}
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2">
      {session.avatarUrl ? (
        <img
          alt=""
          className="h-9 w-9 rounded-full border border-white/15 object-cover"
          src={session.avatarUrl}
        />
      ) : null}
      <div className="min-w-0 text-right">
        <p className="truncate text-sm font-semibold text-white">{session.username}</p>
        <button
          className="inline-flex min-h-0 items-center gap-1 text-xs text-moss-100/70"
          onClick={logout}
          type="button"
        >
          <LogOut size={13} />
          Deconnexion
        </button>
      </div>
    </div>
  );
}
