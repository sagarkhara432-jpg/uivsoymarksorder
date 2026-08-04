import { createFileRoute, Link, Navigate } from "@tanstack/react-router";
import { ShoppingBag, ChefHat, Bike, ShieldCheck, Sparkles } from "lucide-react";
import { useSession, useMyRoles, useMyProfile } from "@/lib/auth";
import ActiveOrderBanner from "@/components/ActiveOrderBanner";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Uivsoymarks — Hot food, delivered fast" },
      { name: "description", content: "Browse menus, order in a tap, and track your food live. Uivsoymarks brings your city's kitchen to your door." },
      { property: "og:title", content: "Uivsoymarks — Hot food, delivered fast" },
      { property: "og:description", content: "Browse menus, order in a tap, and track your food live." },
    ],
  }),
  component: Landing,
});

function Landing() {
  const { user, loading } = useSession();
  const { roles, loading: rolesLoading } = useMyRoles(user);
  const { profile, loading: profileLoading } = useMyProfile(user);

  if (!loading && user && !rolesLoading && !profileLoading) {
    if (roles.includes("admin")) return <Navigate to="/admin" />;
    if (profile && !profile.profile_completed) return <Navigate to="/onboarding" />;
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-40 border-b border-border/60 bg-background/85 backdrop-blur-md">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3">
          <Link to="/" className="flex items-center gap-2">
            <div className="grid h-9 w-9 place-items-center rounded-xl bg-primary text-primary-foreground shadow-[var(--shadow-pop)]">
              <span className="text-lg font-black">U</span>
            </div>
            <span className="text-lg font-extrabold tracking-tight">Uivsoymarks</span>
          </Link>
          <nav className="flex items-center gap-2">
            {user ? (
              <Link to="/menu" className="press rounded-full bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground active:bg-primary-press">
                Order now
              </Link>
            ) : (
              <Link to="/auth" className="press rounded-full bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground active:bg-primary-press">
                Sign in
              </Link>
            )}
          </nav>
        </div>
      </header>

      <section className="relative overflow-hidden">
        <div className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(60%_50%_at_50%_0%,oklch(0.62_0.22_24/0.15),transparent_70%)]" />
        <div className="mx-auto max-w-6xl px-4 pb-8 pt-10 text-center sm:pt-16">
          <div className="mx-auto mb-4 inline-flex items-center gap-1.5 rounded-full bg-offer px-3 py-1 text-xs font-semibold text-offer-foreground">
            <Sparkles className="h-3.5 w-3.5" /> Get 50% off your first order
          </div>
          <h1 className="text-4xl font-extrabold tracking-tight sm:text-6xl">
            Hot food, <span className="text-primary">delivered fast.</span>
          </h1>
          <p className="mx-auto mt-3 max-w-xl text-base text-muted-foreground sm:text-lg">
            Browse hand-picked menus, tap once, and watch your order fly across town in real time.
          </p>
          <div className="mt-6 flex flex-wrap justify-center gap-3">
            <Link to="/menu" className="press rounded-full bg-primary px-6 py-3 text-sm font-semibold text-primary-foreground shadow-[var(--shadow-pop)] active:bg-primary-press">
              <ShoppingBag className="mr-1.5 inline h-4 w-4" /> Order food
            </Link>
            <Link to="/partner" className="press rounded-full border border-border bg-surface px-6 py-3 text-sm font-semibold active:bg-accent">
              Partner with us
            </Link>
          </div>
        </div>

        <div className="mx-auto grid max-w-6xl gap-4 px-4 pb-16 sm:grid-cols-3">
          <FeatureCard icon={<ChefHat className="h-5 w-5" />} title="Live kitchens" text="Real-time order feed with prep-time tracking." tone="orange" />
          <FeatureCard icon={<Bike className="h-5 w-5" />} title="Fastest riders" text="Auto-assigned to your nearest verified partner." tone="fresh" />
          <FeatureCard icon={<ShieldCheck className="h-5 w-5" />} title="Secure & private" text="Masked calls, verified partners, protected data." tone="offer" />
        </div>
      </section>

      {user && <ActiveOrderBanner />}
    </div>
  );
}

function FeatureCard({
  icon, title, text, tone,
}: { icon: React.ReactNode; title: string; text: string; tone: "orange" | "fresh" | "offer" }) {
  const toneMap = {
    orange: "bg-orange text-orange-foreground",
    fresh: "bg-fresh text-fresh-foreground",
    offer: "bg-offer text-offer-foreground",
  };
  return (
    <div className="rounded-2xl border border-border/60 bg-card p-5 shadow-[var(--shadow-card)]">
      <div className={`inline-flex h-10 w-10 items-center justify-center rounded-xl ${toneMap[tone]}`}>{icon}</div>
      <h3 className="mt-3 text-base font-semibold">{title}</h3>
      <p className="mt-1 text-sm text-muted-foreground">{text}</p>
    </div>
  );
}
