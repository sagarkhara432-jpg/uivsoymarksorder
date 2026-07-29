import { execFileSync } from "node:child_process";

/** Runs a read-only SQL query through psql using the ambient PG* env vars. */
export function query(sql: string): string[][] {
  const out = execFileSync("psql", ["-At", "-F", "\u0001", "-c", sql], {
    encoding: "utf8",
  });
  return out
    .split("\n")
    .filter((l) => l.length > 0)
    .map((l) => l.split("\u0001"));
}

export const hasDb = Boolean(process.env.PGHOST);
