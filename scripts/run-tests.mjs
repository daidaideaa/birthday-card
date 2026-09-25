import { readdirSync } from "node:fs";
import { spawnSync } from "node:child_process";

// Do not rely on shell glob expansion: PowerShell/cmd pass *.test.ts literally.
const files = readdirSync("tests").filter((file) => file.endsWith(".test.ts")).sort().map((file) => `tests/${file}`);
if (!files.length) throw Error("No unit tests found in tests/");
const result = spawnSync(process.execPath, ["--import", "tsx", "--test", ...files], { stdio: "inherit" });
if (result.error) throw result.error;
process.exitCode = result.status ?? 1;
