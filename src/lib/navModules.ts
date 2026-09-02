import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

export type NavModule = {
  id: string;
  parent_id: string | null;
  title: string;
  slug: string;
  icon: string;
  description: string | null;
  sort_order: number;
  is_active: boolean;
  created_at: string;
};

export type NavNode = NavModule & { children: NavNode[] };

/** Builds a nested tree from the flat module rows, sorted by sort_order then title. */
export function buildTree(rows: NavModule[]): NavNode[] {
  const byId = new Map<string, NavNode>();
  rows.forEach((r) => byId.set(r.id, { ...r, children: [] }));
  const roots: NavNode[] = [];
  byId.forEach((node) => {
    const parent = node.parent_id ? byId.get(node.parent_id) : null;
    if (parent) parent.children.push(node);
    else roots.push(node);
  });
  const sort = (list: NavNode[]) => {
    list.sort((a, b) => a.sort_order - b.sort_order || a.title.localeCompare(b.title));
    list.forEach((n) => sort(n.children));
  };
  sort(roots);
  return roots;
}

/** Resolves a slug path (e.g. ["ecommerce","mobiles"]) into the matched node chain. */
export function resolvePath(tree: NavNode[], segments: string[]): NavNode[] {
  const chain: NavNode[] = [];
  let level = tree;
  for (const seg of segments) {
    const found = level.find((n) => n.slug === seg);
    if (!found) return chain;
    chain.push(found);
    level = found.children;
  }
  return chain;
}

export function flatten(nodes: NavNode[], depth = 0): { node: NavNode; depth: number }[] {
  return nodes.flatMap((n) => [{ node: n, depth }, ...flatten(n.children, depth + 1)]);
}

/** Live module tree with realtime refresh. */
export function useNavModules() {
  const [rows, setRows] = useState<NavModule[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    const { data, error } = await supabase
      .from("nav_modules")
      .select("*")
      .order("sort_order", { ascending: true });
    if (error) toast.error(error.message);
    setRows((data as NavModule[]) ?? []);
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
    const ch = supabase
      .channel("nav-modules")
      .on("postgres_changes", { event: "*", schema: "public", table: "nav_modules" }, () => load())
      .subscribe();
    return () => {
      supabase.removeChannel(ch);
    };
  }, [load]);

  return { rows, tree: buildTree(rows), loading, reload: load };
}

export type ModuleInput = {
  title: string;
  slug: string;
  icon: string;
  description: string;
  sort_order: number;
  is_active: boolean;
};

export function slugify(value: string) {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export async function createModule(parentId: string | null, input: ModuleInput) {
  const { error } = await supabase.from("nav_modules").insert({ ...input, parent_id: parentId });
  if (error) throw new Error(error.message);
}

export async function updateModule(id: string, input: Partial<ModuleInput>) {
  const { error } = await supabase.from("nav_modules").update(input).eq("id", id);
  if (error) throw new Error(error.message);
}

export async function deleteModule(id: string) {
  const { error } = await supabase.from("nav_modules").delete().eq("id", id);
  if (error) throw new Error(error.message);
}
