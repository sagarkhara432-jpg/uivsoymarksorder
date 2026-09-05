import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { Search, ShieldCheck, UserCog, Save, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

export const MASTER_EMAIL = "sagarkharal21@gmail.com";

const ASSIGNABLE = [
  { key: "admin", label: "Admin", hint: "Full control (owner only)", ownerOnly: true },
  { key: "manager", label: "Manager", hint: "Operations & approvals", ownerOnly: false },
  { key: "editor", label: "Editor", hint: "Menu & content edits", ownerOnly: false },
  { key: "kitchen", label: "Kitchen", hint: "Store dashboard", ownerOnly: false },
  { key: "delivery", label: "Delivery", hint: "Rider dashboard", ownerOnly: false },
] as const;

type StaffRow = {
  id: string;
  email: string | null;
  full_name: string | null;
  is_blocked: boolean;
  roles: string[];
};

const PERM_ROLES = ["super_admin", "manager", "editor"] as const;
type PermRow = {
  id: string;
  role: string;
  can_view: boolean;
  can_create: boolean;
  can_edit: boolean;
  can_delete: boolean;
};

export default function StaffRolesTab() {
  const [myEmail, setMyEmail] = useState("");
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<StaffRow[]>([]);
  const [staff, setStaff] = useState<StaffRow[]>([]);
  const [searching, setSearching] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);

  const isOwner = myEmail.toLowerCase() === MASTER_EMAIL;

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setMyEmail(data.user?.email ?? ""));
  }, []);

  const loadStaff = useCallback(async () => {
    const { data: roleRows } = await supabase.from("user_roles").select("user_id, role");
    const staffIds = [...new Set((roleRows ?? []).filter((r) => r.role !== "customer").map((r) => r.user_id))];
    if (!staffIds.length) { setStaff([]); return; }
    const { data: profs } = await supabase
      .from("profiles")
      .select("id, email, full_name, is_blocked")
      .in("id", staffIds);
    setStaff(
      (profs ?? []).map((p) => ({
        ...p,
        roles: (roleRows ?? []).filter((r) => r.user_id === p.id).map((r) => String(r.role)),
      })),
    );
  }, []);

  useEffect(() => { loadStaff(); }, [loadStaff]);

  async function search() {
    const q = query.trim();
    if (q.length < 2) { toast.error("Type at least 2 characters"); return; }
    setSearching(true);
    const { data, error } = await supabase
      .from("profiles")
      .select("id, email, full_name, is_blocked")
      .or(`email.ilike.%${q}%,full_name.ilike.%${q}%`)
      .limit(20);
    setSearching(false);
    if (error) { toast.error(error.message); return; }
    const ids = (data ?? []).map((p) => p.id);
    const { data: roleRows } = ids.length
      ? await supabase.from("user_roles").select("user_id, role").in("user_id", ids)
      : { data: [] as any[] };
    setResults(
      (data ?? []).map((p) => ({
        ...p,
        roles: (roleRows ?? []).filter((r: any) => r.user_id === p.id).map((r: any) => String(r.role)),
      })),
    );
    if (!data?.length) toast.info("No account found. Ask them to sign in once first.");
  }

  async function toggleRole(row: StaffRow, role: string, on: boolean) {
    setBusy(`${row.id}:${role}`);
    const res = on
      ? await supabase.from("user_roles").insert({ user_id: row.id, role: role as any })
      : await supabase.from("user_roles").delete().eq("user_id", row.id).eq("role", role as any);
    setBusy(null);
    if (res.error) { toast.error(res.error.message); return; }
    toast.success(`${on ? "Granted" : "Removed"} ${role} for ${row.email ?? "user"}`);
    const apply = (list: StaffRow[]) =>
      list.map((r) =>
        r.id === row.id
          ? { ...r, roles: on ? [...new Set([...r.roles, role])] : r.roles.filter((x) => x !== role) }
          : r,
      );
    setResults(apply);
    setStaff(apply);
    loadStaff();
  }

  return (
    <div className="space-y-4">
      <section className="rounded-3xl border border-border/60 bg-card p-4">
        <div className="flex items-center gap-2">
          <UserCog className="h-4 w-4 text-primary" />
          <h2 className="font-extrabold">Create an admin account</h2>
        </div>
        <p className="mt-1 text-xs text-muted-foreground">
          Ask the person to sign in once at the app with Google, then find them here and grant Manager or Editor access.
          {isOwner ? " Only you can grant full Admin." : " Full Admin can only be granted by the owner account."}
        </p>
        <div className="mt-3 flex gap-2">
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") search(); }}
            placeholder="Search by email or name"
            className="flex-1 rounded-full border border-border bg-surface px-4 py-2.5 text-sm outline-none focus:border-primary"
          />
          <button onClick={search} className="press inline-flex items-center gap-1.5 rounded-full bg-primary px-4 py-2.5 text-sm font-bold text-primary-foreground active:bg-primary-press">
            {searching ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />} Find
          </button>
        </div>
        <div className="mt-3 space-y-2">
          {results.map((r) => (
            <PersonCard key={r.id} row={r} isOwner={isOwner} busy={busy} onToggle={toggleRole} />
          ))}
        </div>
      </section>

      <section className="rounded-3xl border border-border/60 bg-card p-4">
        <div className="flex items-center gap-2">
          <ShieldCheck className="h-4 w-4 text-primary" />
          <h2 className="font-extrabold">Current staff</h2>
        </div>
        <div className="mt-3 space-y-2">
          {!staff.length && <p className="py-8 text-center text-sm text-muted-foreground">No staff accounts yet.</p>}
          {staff.map((r) => (
            <PersonCard key={r.id} row={r} isOwner={isOwner} busy={busy} onToggle={toggleRole} />
          ))}
        </div>
      </section>

      <PermissionMatrix canEdit={isOwner} />
    </div>
  );
}

function PersonCard({
  row, isOwner, busy, onToggle,
}: {
  row: StaffRow;
  isOwner: boolean;
  busy: string | null;
  onToggle: (row: StaffRow, role: string, on: boolean) => void;
}) {
  return (
    <div className="rounded-2xl border border-border/60 bg-surface p-3">
      <div className="flex items-center justify-between gap-2">
        <div className="min-w-0">
          <p className="truncate text-sm font-bold">{row.full_name || row.email || row.id.slice(0, 8)}</p>
          <p className="truncate text-xs text-muted-foreground">{row.email}</p>
        </div>
        {row.is_blocked && <span className="rounded-full bg-destructive/10 px-2 py-0.5 text-[10px] font-bold text-destructive">Blocked</span>}
      </div>
      <div className="mt-2 flex flex-wrap gap-1.5">
        {ASSIGNABLE.map((a) => {
          const on = row.roles.includes(a.key);
          const locked = a.ownerOnly && !isOwner;
          const key = `${row.id}:${a.key}`;
          return (
            <button
              key={a.key}
              title={locked ? "Owner account only" : a.hint}
              disabled={locked || busy === key}
              onClick={() => onToggle(row, a.key, !on)}
              className={`press inline-flex items-center gap-1 rounded-full px-3 py-1.5 text-xs font-semibold disabled:opacity-50 ${
                on ? "bg-primary text-primary-foreground" : "border border-border bg-card active:bg-accent"
              }`}
            >
              {busy === key && <Loader2 className="h-3 w-3 animate-spin" />}
              {a.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}

function PermissionMatrix({ canEdit }: { canEdit: boolean }) {
  const [rows, setRows] = useState<PermRow[]>([]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    supabase.from("admin_permissions").select("*").then(({ data }) => {
      const existing = (data ?? []) as PermRow[];
      setRows(
        PERM_ROLES.map(
          (role) =>
            existing.find((e) => e.role === role) ?? {
              id: "", role, can_view: true, can_create: false, can_edit: false, can_delete: false,
            },
        ),
      );
    });
  }, []);

  function flip(role: string, field: keyof PermRow) {
    setRows((rs) => rs.map((r) => (r.role === role ? { ...r, [field]: !r[field] } : r)));
  }

  async function save() {
    setSaving(true);
    for (const r of rows) {
      const payload = {
        role: r.role, can_view: r.can_view, can_create: r.can_create, can_edit: r.can_edit, can_delete: r.can_delete,
      };
      const res = r.id
        ? await supabase.from("admin_permissions").update(payload).eq("id", r.id)
        : await supabase.from("admin_permissions").insert(payload);
      if (res.error) { setSaving(false); toast.error(res.error.message); return; }
    }
    setSaving(false);
    toast.success("Permissions saved");
  }

  const fields: { key: keyof PermRow; label: string }[] = [
    { key: "can_view", label: "View" },
    { key: "can_create", label: "Create" },
    { key: "can_edit", label: "Edit" },
    { key: "can_delete", label: "Delete" },
  ];

  return (
    <section className="rounded-3xl border border-border/60 bg-card p-4">
      <h2 className="font-extrabold">What each role can do</h2>
      <p className="mt-1 text-xs text-muted-foreground">Applies to every admin screen. {canEdit ? "" : "Owner account only."}</p>
      <div className="mt-3 overflow-x-auto">
        <table className="w-full min-w-[420px] text-sm">
          <thead>
            <tr className="text-left text-xs uppercase text-muted-foreground">
              <th className="py-2">Role</th>
              {fields.map((f) => <th key={String(f.key)} className="py-2 text-center">{f.label}</th>)}
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.role} className="border-t border-border/60">
                <td className="py-2 font-semibold capitalize">{r.role.replace("_", " ")}</td>
                {fields.map((f) => (
                  <td key={String(f.key)} className="py-2 text-center">
                    <input
                      type="checkbox"
                      disabled={!canEdit}
                      checked={Boolean(r[f.key])}
                      onChange={() => flip(r.role, f.key)}
                      className="h-4 w-4 accent-[hsl(var(--primary))]"
                    />
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {canEdit && (
        <button onClick={save} disabled={saving} className="press mt-3 inline-flex items-center gap-1.5 rounded-full bg-primary px-4 py-2 text-sm font-bold text-primary-foreground active:bg-primary-press disabled:opacity-60">
          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />} Save permissions
        </button>
      )}
    </section>
  );
}
