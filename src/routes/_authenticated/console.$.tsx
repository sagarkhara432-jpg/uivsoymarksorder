import { createFileRoute, Link, useParams } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { ChevronRight, Pencil, Plus, Trash2 } from "lucide-react";
import { deleteModule, resolvePath, useNavModules, type NavNode } from "@/lib/navModules";
import ModuleIcon from "@/components/console/ModuleIcon";
import ModuleFormDialog from "@/components/console/ModuleFormDialog";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";

export const Route = createFileRoute("/_authenticated/console/$")({
  component: ConsoleDrillDown,
});

function ConsoleDrillDown() {
  const { _splat } = useParams({ from: "/_authenticated/console/$" });
  const segments = useMemo(() => String(_splat ?? "").split("/").filter(Boolean), [_splat]);
  const { tree, loading, reload } = useNavModules();

  const chain = resolvePath(tree, segments);
  const current = chain.length ? chain[chain.length - 1] : null;
  const children = current ? current.children : tree;

  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<NavNode | null>(null);

  async function remove(node: NavNode) {
    if (!confirm(`Delete “${node.title}” and everything under it?`)) return;
    try {
      await deleteModule(node.id);
      toast.success("Screen deleted");
      reload();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not delete");
    }
  }

  if (loading) {
    return (
      <div className="grid gap-2.5 p-4 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <Skeleton key={i} className="h-24 rounded-2xl" />
        ))}
      </div>
    );
  }

  if (segments.length && !current) {
    return (
      <div className="p-6">
        <p className="text-sm font-bold">Screen not found</p>
        <p className="mt-1 text-xs text-muted-foreground">This module path no longer exists.</p>
        <Link to="/console" className="mt-3 inline-block text-xs font-bold text-primary">
          Back to overview
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-4 p-4">
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-xl font-black">{current?.title ?? "Modules"}</h1>
          <p className="mt-0.5 text-xs font-semibold text-muted-foreground">
            {current?.description || `${children.length} sub-screen${children.length === 1 ? "" : "s"}`}
          </p>
        </div>
        <div className="flex gap-2">
          {current && (
            <Button variant="outline" size="sm" onClick={() => { setEditing(current); setFormOpen(true); }}>
              <Pencil className="mr-1.5 h-3.5 w-3.5" /> Edit this screen
            </Button>
          )}
          <Button size="sm" onClick={() => { setEditing(null); setFormOpen(true); }}>
            <Plus className="mr-1.5 h-3.5 w-3.5" /> Add sub-screen
          </Button>
        </div>
      </header>

      {!children.length ? (
        <div className="rounded-2xl border border-dashed border-border bg-card p-8 text-center">
          <p className="text-sm font-bold">This is a final screen</p>
          <p className="mx-auto mt-1 max-w-sm text-xs text-muted-foreground">
            Nothing is nested under {current?.title ?? "this module"} yet. Add a sub-screen to keep drilling down.
          </p>
        </div>
      ) : (
        <div className="grid gap-2.5 sm:grid-cols-2 lg:grid-cols-3">
          {children.map((node) => (
            <div
              key={node.id}
              className="group rounded-2xl border border-border/60 bg-card p-3.5 shadow-[var(--shadow-card)] transition-all hover:-translate-y-0.5 hover:border-primary/50 hover:shadow-lg"
            >
              <Link
                to="/console/$"
                params={{ _splat: [...segments, node.slug].join("/") }}
                className="block"
              >
                <div className="flex items-center justify-between">
                  <ModuleIcon name={node.icon} className="h-5 w-5 text-primary transition-transform group-hover:scale-110" />
                  <ChevronRight className="h-4 w-4 text-muted-foreground" />
                </div>
                <p className="mt-2 text-sm font-black">{node.title}</p>
                <p className="line-clamp-2 text-[11px] font-semibold text-muted-foreground">
                  {node.description || `${node.children.length} screen${node.children.length === 1 ? "" : "s"}`}
                </p>
              </Link>
              <div className="mt-2 flex gap-1.5">
                <Button variant="outline" size="sm" className="h-7 px-2 text-[11px]" onClick={() => { setEditing(node); setFormOpen(true); }}>
                  <Pencil className="mr-1 h-3 w-3" /> Edit
                </Button>
                <Button variant="outline" size="sm" className="h-7 px-2 text-[11px] text-destructive" onClick={() => remove(node)}>
                  <Trash2 className="mr-1 h-3 w-3" /> Delete
                </Button>
                {!node.is_active && (
                  <span className="ml-auto self-center rounded-full bg-muted px-2 py-0.5 text-[10px] font-bold text-muted-foreground">
                    Hidden
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      <ModuleFormDialog
        open={formOpen}
        onOpenChange={setFormOpen}
        parentId={editing ? (editing.parent_id ?? null) : (current?.id ?? null)}
        parentTitle={current?.title ?? "Master Admin"}
        editing={editing}
        onSaved={reload}
      />
    </div>
  );
}
