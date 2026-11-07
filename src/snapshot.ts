import { mkdirSync, readFileSync, writeFileSync, existsSync, readdirSync } from "node:fs";
import path from "node:path";
import type { IR } from "./core/ir.js";

export function snapshotPath(dir: string, name = "latest.json"): string {
  return path.join(dir, "meta", name);
}

export function loadSnapshot(dir: string): IR | null {
  const p = snapshotPath(dir, "latest.json");
  if (!existsSync(p)) return null;
  const raw = readFileSync(p, "utf8");
  return JSON.parse(raw) as IR;
}

export function saveSnapshot(dir: string, ir: IR, fileName = "latest.json"): string {
  const metaDir = path.join(dir, "meta");
  mkdirSync(metaDir, { recursive: true });
  const p = path.join(metaDir, fileName);
  writeFileSync(p, JSON.stringify(ir, null, 2) + "\n");
  return p;
}

export function nextMigrationNumber(dir: string): number {
  if (!existsSync(dir)) return 1;
  const files = readdirSync(dir).filter((f: string) => /^\d{4}_.*\.sql$/.test(f));
  if (files.length === 0) return 1;
  const nums = files.map((f: string) => parseInt(f.slice(0, 4), 10));
  return Math.max(...nums) + 1;
}