import { useState } from "react";
import { Link } from "@tanstack/react-router";
import { ChevronRight, LayoutDashboard, PanelLeftClose, PanelLeftOpen } from "lucide-react";
import type { NavNode } from "@/lib/navModules";
import ModuleIcon from "./ModuleIcon";
import { cn } from "@/lib/utils";
import { Skeleton } from "@/components/ui/skeleton";

type Props = {
  tree: NavNode[];
  loading: boolean;
  activePath: string[];
  collapsed: boolean;
  onToggleCollapsed: () => void;
};

/** Collapsible hierarchical tree menu with active-state highlighting. */
export default function ConsoleSidebar({ tree, loading, activePath, collapsed, onToggleCollapsed }: Props) {
  return (
    <aside
      className={cn(
        "shrink-0 border-r border-border/60 bg-card/60 transition-all duration-300",
        collapsed ? "w-14" : "w-64",
      )}
    >
      <div className="flex items-center justify-between gap-2 border-b border-border/60 px-3 py-3">
        {!collapsed && <p className="truncate text-xs font-black uppercase tracking-wide text-muted-foreground">Master console</p>}
        <button
          type="button"
          onClick={onToggleCollapsed}
          aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          className="rounded-lg p-1.5 text-muted-foreground transition hover:bg-muted hover:text-foreground"
        >
          {collapsed ? <PanelLeftOpen className="h-4 w-4" /> : <PanelLeftClose className="h-4 w-4" />}
        </button>
      </div>

      <nav className="space-y-0.5 p-2">
        <Link
          to="/console"
          activeOptions={{ exact: true }}
          className="flex items-center gap-2 rounded-xl px-2.5 py-2 text-sm font-semibold text-muted-foreground transition hover:bg-muted hover:text-foreground data-[status=active]:bg-primary/10 data-[status=active]:text-primary"
        >
          <LayoutDashboard className="h-4 w-4 shrink-0" />
          {!collapsed && <span>Overview</span>}
        </Link>

        {loading
          ? [0, 1, 2].map((i) => <Skeleton key={i} className="h-9 w-full rounded-xl" />)
          : tree.map((node) => (
              <TreeItem key={node.id} node={node} path={[node.slug]} activePath={activePath} collapsed={collapsed} depth={0} />
            ))}
      </nav>
    </aside>
  );
}

function TreeItem({
  node,
  path,
  activePath,
  collapsed,
  depth,
}: {
  node: NavNode;
  path: string[];
  activePath: string[];
  collapsed: boolean;
  depth: number;
}) {
  const onActiveBranch = activePath[depth] === node.slug;
  const [open, setOpen] = useState(onActiveBranch);
  const isCurrent = onActiveBranch && activePath.length === path.length;
  const hasChildren = node.children.length > 0;

  return (
    <div>
      <div className="flex items-center gap-1">
        <Link
          to="/console/$"
          params={{ _splat: path.join("/") }}
          className={cn(
            "flex min-w-0 flex-1 items-center gap-2 rounded-xl px-2.5 py-2 text-sm font-semibold transition",
            isCurrent ? "bg-primary/10 text-primary" : "text-muted-foreground hover:bg-muted hover:text-foreground",
          )}
          style={{ paddingLeft: collapsed ? undefined : 10 + depth * 12 }}
          title={node.title}
        >
          <ModuleIcon name={node.icon} className="h-4 w-4 shrink-0" />
          {!collapsed && <span className="truncate">{node.title}</span>}
        </Link>
        {!collapsed && hasChildren && (
          <button
            type="button"
            onClick={() => setOpen((v) => !v)}
            aria-label={open ? `Collapse ${node.title}` : `Expand ${node.title}`}
            className="rounded-lg p-1 text-muted-foreground transition hover:bg-muted hover:text-foreground"
          >
            <ChevronRight className={cn("h-4 w-4 transition-transform", open && "rotate-90")} />
          </button>
        )}
      </div>
      {!collapsed && hasChildren && open && (
        <div className="mt-0.5 space-y-0.5">
          {node.children.map((child) => (
            <TreeItem
              key={child.id}
              node={child}
              path={[...path, child.slug]}
              activePath={activePath}
              collapsed={collapsed}
              depth={depth + 1}
            />
          ))}
        </div>
      )}
    </div>
  );
}
