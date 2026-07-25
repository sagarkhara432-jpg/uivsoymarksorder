import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { lovable } from "@/integrations/lovable";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/auth")({
  head: () => ({
    meta: [
      { title: "Sign in — Uivsoymarks" },
      { name: "description", content: "Sign in to Uivsoymarks with Google to order food, run a kitchen, or deliver." },
      { property: "og:title", content: "Sign in — Uivsoymarks" },
      { property: "og:description", content: "Sign in with Google to order food, run a kitchen, or deliver." },
    ],
  }),
  component: AuthPage,
});

function AuthPage() {
  const navigate = useNavigate();
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (data.user) navigate({ to: "/menu" });
    });
  }, []);

  async function signIn() {
    setBusy(true);
    const res = await lovable.auth.signInWithOAuth("google", { redirect_uri: window.location.origin });
    if (res.error) {
      toast.error(res.error.message || "Sign-in failed");
      setBusy(false);
      return;
    }
    if (res.redirected) return;
    navigate({ to: "/menu" });
  }

  return (
    <div className="grid min-h-screen place-items-center bg-background px-4">
      <div className="w-full max-w-sm rounded-3xl border border-border/60 bg-card p-6 shadow-[var(--shadow-card)]">
        <Link to="/" className="mb-4 inline-flex items-center gap-2">
          <div className="grid h-10 w-10 place-items-center rounded-xl bg-primary text-primary-foreground">
            <span className="text-xl font-black">U</span>
          </div>
          <span className="font-extrabold tracking-tight">Uivsoymarks</span>
        </Link>
        <h1 className="text-2xl font-extrabold">Welcome</h1>
        <p className="mt-1 text-sm text-muted-foreground">Sign in with Google to continue.</p>
        <button
          onClick={signIn}
          disabled={busy}
          className="press mt-6 flex w-full items-center justify-center gap-3 rounded-full border border-border bg-surface px-4 py-3 text-sm font-semibold active:bg-accent disabled:opacity-60"
        >
          <GoogleGlyph />
          {busy ? "Opening Google…" : "Continue with Google"}
        </button>
        <p className="mt-5 text-center text-xs text-muted-foreground">
          By continuing you agree to our terms. First-order offer is locked to one Google account per person.
        </p>
      </div>
    </div>
  );
}

function GoogleGlyph() {
  return (
    <svg width="18" height="18" viewBox="0 0 48 48" aria-hidden>
      <path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3C33.9 32.9 29.4 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.9 1.2 8 3.1l5.7-5.7C34.2 6.2 29.4 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.2-.1-2.3-.4-3.5z" />
      <path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.7 15.4 19 12 24 12c3.1 0 5.9 1.2 8 3.1l5.7-5.7C34.2 6.2 29.4 4 24 4 16.3 4 9.7 8.3 6.3 14.7z" />
      <path fill="#4CAF50" d="M24 44c5.3 0 10.1-2 13.7-5.3l-6.3-5.2C29.4 35 26.9 36 24 36c-5.4 0-9.9-3.1-11.3-7.9l-6.6 5.1C9.6 39.6 16.2 44 24 44z" />
      <path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.7 2-2 3.7-3.6 4.9l6.3 5.2C41 34.9 44 30 44 24c0-1.2-.1-2.3-.4-3.5z" />
    </svg>
  );
}
