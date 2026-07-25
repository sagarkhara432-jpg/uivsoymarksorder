import { createFileRoute, Link } from "@tanstack/react-router";
import { ChefHat, Bike, ArrowLeft } from "lucide-react";

export const Route = createFileRoute("/partner")({
  head: () => ({
    meta: [
      { title: "Partner with Uivsoymarks" },
      { name: "description", content: "Run a kitchen or deliver with Uivsoymarks. Upload your ID and start earning after admin approval." },
      { property: "og:title", content: "Partner with Uivsoymarks" },
      { property: "og:description", content: "Run a kitchen or deliver with Uivsoymarks." },
    ],
  }),
  component: Partner,
});

function Partner() {
  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border/60 px-4 py-3">
        <div className="mx-auto flex max-w-4xl items-center gap-3">
          <Link to="/" className="press grid h-9 w-9 place-items-center rounded-full border border-border bg-surface active:bg-accent"><ArrowLeft className="h-4 w-4" /></Link>
          <h1 className="text-lg font-extrabold">Partner with Uivsoymarks</h1>
        </div>
      </header>
      <main className="mx-auto grid max-w-4xl gap-3 p-4 sm:grid-cols-2">
        <Link to="/kitchen" className="press rounded-3xl border border-border/60 bg-card p-6 shadow-[var(--shadow-card)] active:bg-accent">
          <ChefHat className="h-8 w-8 text-primary" />
          <h2 className="mt-3 text-lg font-extrabold">Run a kitchen</h2>
          <p className="mt-1 text-sm text-muted-foreground">Serve hot meals to hungry customers. Sign in with Google, upload your ID, and start receiving orders once approved.</p>
        </Link>
        <Link to="/delivery" className="press rounded-3xl border border-border/60 bg-card p-6 shadow-[var(--shadow-card)] active:bg-accent">
          <Bike className="h-8 w-8 text-primary" />
          <h2 className="mt-3 text-lg font-extrabold">Deliver</h2>
          <p className="mt-1 text-sm text-muted-foreground">Choose your hours. Ride when it works for you. Upload your ID and vehicle info; go online once approved.</p>
        </Link>
      </main>
    </div>
  );
}
