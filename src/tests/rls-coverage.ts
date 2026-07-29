/**
 * Security-invariant coverage tracker for the orders RLS suite.
 *
 * Standard line coverage says nothing about rules that live in Postgres, so the
 * suite tracks its own universe: every UPDATE/ALL policy on public.orders and
 * every RAISE EXCEPTION guard inside enforce_order_update_rules(). Tests call
 * `cover()` for each rule they assert, and the summary below prints the
 * percentage of live database rules the suite actually pins down.
 */
import { query, queryScalar } from "./db";

const covered = new Set<string>();

export function cover(...ids: string[]) {
  for (const id of ids) covered.add(id);
}

export function policyUniverse(): string[] {
  return query(
    `select policyname from pg_policies
     where schemaname='public' and tablename='orders' and cmd in ('UPDATE','ALL')
     order by policyname`,
  ).map((r) => `policy:${r[0]}`);
}

export function guardUniverse(): string[] {
  const src = queryScalar(
    `select pg_get_functiondef('public.enforce_order_update_rules()'::regprocedure)`,
  );
  return [...src.matchAll(/RAISE EXCEPTION '([^']+)'/g)].map((m) => `guard:${m[1]}`);
}

export function coverageReport() {
  const universe = [...new Set([...policyUniverse(), ...guardUniverse()])];
  const hit = universe.filter((u) => covered.has(u));
  const missed = universe.filter((u) => !covered.has(u));
  const pct = universe.length === 0 ? 0 : (hit.length / universe.length) * 100;
  return { universe, hit, missed, pct };
}

export function printCoverageSummary() {
  const { universe, hit, missed, pct } = coverageReport();
  const lines = [
    "",
    "─────────── Orders RLS security-invariant coverage ───────────",
    ` Database rules found : ${universe.length}`,
    ` Rules asserted       : ${hit.length}`,
    ` Coverage             : ${pct.toFixed(1)}%`,
  ];
  if (missed.length) {
    lines.push(" Uncovered:");
    for (const m of missed) lines.push(`   • ${m}`);
  } else {
    lines.push(" Uncovered            : none");
  }
  lines.push("──────────────────────────────────────────────────────────────", "");
  // eslint-disable-next-line no-console
  console.log(lines.join("\n"));
  return { universe, hit, missed, pct };
}
