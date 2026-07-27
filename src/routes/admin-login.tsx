import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Shield, LogOut } from "lucide-react";
import { lovable } from "@/integrations/lovable";
import { supabase } from "@/integrations/supabase/client";

export const MASTER_ADMIN_EMAIL = "sagarkharal21@gmail.com";

export const Route = createFileRoute("/admin-login")({
  head: () => ({
    meta: [
      { title: "Master Admin Login — Uivsoymarks" },
      { name: "description", content: "Private master admin sign-in for the Uivsoymarks control panel." },
      { property: "og:title", content: "Master Admin Login — Uivsoymarks" },
      { property: "og:description", content: "Private master admin sign-in for the Uivsoymarks control panel." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: AdminLoginPage,
});

function AdminLoginPage() {
  const navigate = useNavigate();
  const [busy, setBusy] = useState(false);
  const [wrongEmail, setWrongEmail] = useState<string | null>(null);
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    (async () => {
      const { data } = await supabase.auth.getUser();
      const mail = (data.user?.email ?? "").toLowerCase();
      if (!data.user) { setChecking(false); return; }
      if (mail === MASTER_ADMIN_EMAIL) { navigate({ to: "/admin" }); return; }
      setWrongEmail(data.user.email ?? "unknown");
      setChecking(false);
    })();
  }, []);

  async function signIn() {
    setBusy(true);
    const res = await lovable.auth.signInWithOAuth("google", {
      redirect_uri: `${window.location.origin}/admin-login`,
    });
    if (res.error) {
      toast.error(res.error.message || "Sign-in failed");
      setBusy(false);
      return;
    }
    if (res.redirected) return;
    const { data } = await supabase.auth.getUser();
    const mail = (data.user?.email ?? "").toLowerCase();
    if (mail !== MASTER_ADMIN_EMAIL) {
      setWrongEmail(data.user?.email ?? "unknown");
      setBusy(false);
      return;
    }
    navigate({ to: "/admin" });
  }

  async function switchAccount() {
    await supabase.auth.signOut();
    setWrongEmail(null);
  }

  if (checking) return <div className="grid min-h-screen place-items-center text-sm">Loading…</div>;

  return (
    <div className="grid min-h-screen place-items-center bg-background px-4">
      <div className="w-full max-w-sm rounded-3xl border border-border/60 bg-card p-6 shadow-[var(--shadow-card)]">
        <div className="grid h-12 w-12 place-items-center rounded-2xl bg-primary/10 text-primary">
          <Shield className="h-6 w-6" />
        </div>
        <h1 className="mt-4 text-2xl font-extrabold">Master Admin</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Private control panel. Only <span className="font-semibold text-foreground">{MASTER_ADMIN_EMAIL}</span> can sign in here.
        </p>

        {wrongEmail ? (
          <div className="mt-5 rounded-2xl border border-destructive/40 bg-destructive/5 p-3">
            <p className="text-sm font-bold text-destructive">Access denied</p>
            <p className="mt-1 text-xs text-muted-foreground">
              You are signed in as <span className="font-semibold">{wrongEmail}</span>. This panel is locked to the owner account.
            </p>
            <button
              onClick={switchAccount}
              className="press mt-3 inline-flex w-full items-center justify-center gap-2 rounded-full border border-border bg-surface px-4 py-2.5 text-sm font-semibold active:bg-accent"
            >
              <LogOut className="h-4 w-4" /> Sign out and use owner account
            </button>
          </div>
        ) : (
          <button
            onClick={signIn}
            disabled={busy}
            className="press mt-6 flex w-full items-center justify-center gap-3 rounded-full border border-border bg-surface px-4 py-3 text-sm font-semibold active:bg-accent disabled:opacity-60"
          >
            <GoogleGlyph />
            {busy ? "Opening Google…" : "Sign in with owner Google"}
          </button>
        )}

        <Link to="/" className="mt-5 block text-center text-xs font-semibold text-muted-foreground">
          Back to Uivsoymarks
        </Link>
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
