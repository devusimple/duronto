#!/usr/bin/env node
import { runSql } from "./commands/sql.js";
import { runInit } from "./commands/init.js";
import { runTypes } from "./commands/types.js";
import { runGenerate } from "./commands/generate.js";
import { runDiff } from "./commands/diff.js";
import { runCheck } from "./commands/check.js";

async function main() {
  const args = process.argv.slice(2);
  const cmd = args[0];
  const cwd = process.cwd();
  try {
    if (cmd === "sql") {
      const out = await runSql(cwd);
      process.stdout.write(out);
    } else if (cmd === "init") {
      runInit(cwd);
      console.log("Initialized duronto project.");
    } else if (cmd === "types") {
      const out = await runTypes(cwd, args[1] === "--out" ? args[2] : undefined);
      console.log(`Wrote ${out}`);
    } else if (cmd === "generate") {
      const nameIdx = args.indexOf("--name");
      const name = nameIdx >= 0 ? args[nameIdx + 1] : undefined;
      const allow = args.includes("--allow-destructive");
      const opts: { name?: string; allowDestructive?: boolean } = { allowDestructive: allow };
      if (name !== undefined) opts.name = name;
      const out = await runGenerate(cwd, opts);
      console.log(`Wrote ${out}`);
    } else if (cmd === "diff") {
      const out = await runDiff(cwd, args.includes("--json"));
      process.stdout.write(out);
    } else if (cmd === "check") {
      const ok = await runCheck(cwd);
      if (!ok) {
        console.error("Schema differs from latest snapshot.");
        process.exit(1);
      }
      console.log("Schema matches latest snapshot.");
    } else if (cmd === "help" || !cmd) {
      console.log("Usage: duronto <sql|init|types|generate|diff|check>");
    } else {
      console.error(`Unknown command: ${cmd}`);
      process.exit(1);
    }
  } catch (e) {
    console.error(e instanceof Error ? e.message : String(e));
    process.exit(1);
  }
}

main();