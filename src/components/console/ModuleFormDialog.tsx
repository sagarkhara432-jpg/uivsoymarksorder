import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { createModule, slugify, updateModule, type ModuleInput, type NavNode } from "@/lib/navModules";
import ModuleIcon, { ICON_CHOICES } from "./ModuleIcon";
import { cn } from "@/lib/utils";

type Props = {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  parentId: string | null;
  parentTitle: string;
  editing?: NavNode | null;
  onSaved?: () => void;
};

const empty: ModuleInput = { title: "", slug: "", icon: "Folder", description: "", sort_order: 0, is_active: true };

/** Create / edit a nested screen under the currently viewed parent module. */
export default function ModuleFormDialog({ open, onOpenChange, parentId, parentTitle, editing, onSaved }: Props) {
  const [form, setForm] = useState<ModuleInput>(empty);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    setForm(
      editing
        ? {
            title: editing.title,
            slug: editing.slug,
            icon: editing.icon,
            description: editing.description ?? "",
            sort_order: editing.sort_order,
            is_active: editing.is_active,
          }
        : empty,
    );
  }, [open, editing]);

  async function save() {
    const title = form.title.trim();
    if (!title) return toast.error("Title is required");
    const payload: ModuleInput = { ...form, title, slug: slugify(form.slug || title) };
    setSaving(true);
    try {
      if (editing) await updateModule(editing.id, payload);
      else await createModule(parentId, payload);
      toast.success(editing ? "Screen updated" : "Screen created");
      onOpenChange(false);
      onSaved?.();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not save");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{editing ? `Edit ${editing.title}` : `New sub-option under ${parentTitle}`}</DialogTitle>
        </DialogHeader>

        <div className="space-y-3">
          <div className="space-y-1.5">
            <Label htmlFor="m-title">Title</Label>
            <Input id="m-title" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="Smartwatches" />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="m-slug">URL slug</Label>
            <Input
              id="m-slug"
              value={form.slug}
              onChange={(e) => setForm({ ...form, slug: e.target.value })}
              placeholder={slugify(form.title) || "smartwatches"}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="m-desc">Description</Label>
            <Textarea id="m-desc" rows={2} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
          </div>
          <div className="space-y-1.5">
            <Label>Icon</Label>
            <div className="grid grid-cols-8 gap-1.5">
              {ICON_CHOICES.map((name) => (
                <button
                  key={name}
                  type="button"
                  aria-label={name}
                  onClick={() => setForm({ ...form, icon: name })}
                  className={cn(
                    "flex items-center justify-center rounded-lg border border-border/60 p-2 transition hover:bg-muted",
                    form.icon === name && "border-primary bg-primary/10 text-primary",
                  )}
                >
                  <ModuleIcon name={name} />
                </button>
              ))}
            </div>
          </div>
          <div className="flex items-end gap-3">
            <div className="w-28 space-y-1.5">
              <Label htmlFor="m-order">Sort order</Label>
              <Input
                id="m-order"
                type="number"
                value={form.sort_order}
                onChange={(e) => setForm({ ...form, sort_order: Number(e.target.value) || 0 })}
              />
            </div>
            <div className="flex items-center gap-2 pb-2">
              <Switch id="m-active" checked={form.is_active} onCheckedChange={(v) => setForm({ ...form, is_active: v })} />
              <Label htmlFor="m-active">Active</Label>
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={save} disabled={saving}>{saving ? "Saving…" : "Save"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
