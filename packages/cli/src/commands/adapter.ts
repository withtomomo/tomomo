import { Command } from "commander";
import { rm } from "node:fs/promises";
import { join } from "node:path";
import {
  loadConfig,
  saveConfig,
  getAdaptersDir,
  listAllRuntimes,
  installCommunityAdapter,
} from "@tomomo/core";

export const adapterCommand = new Command("adapter").description(
  "Manage runtime adapters"
);

adapterCommand
  .command("add")
  .description("Install an adapter from npm")
  .argument("<package>", "npm package name")
  .option("--json", "Output as JSON")
  .action(async (packageName: string, options: { json?: boolean }) => {
    if (!options.json) {
      console.log(`Installing ${packageName}...`);
    }

    try {
      const { name: runtime } = await installCommunityAdapter(packageName);

      if (options.json) {
        console.log(
          JSON.stringify(
            { runtime, package: packageName, installed: true },
            null,
            2
          )
        );
        return;
      }

      console.log(`Adapter "${runtime}" installed (${packageName}).`);
      console.log(`Set "runtime": "${runtime}" in agent.json to use it.`);
    } catch (err) {
      if (options.json) {
        console.log(JSON.stringify({ error: (err as Error).message }, null, 2));
        process.exit(1);
      }
      console.error((err as Error).message);
      process.exit(1);
    }
  });

adapterCommand
  .command("remove")
  .description("Uninstall an adapter")
  .argument("<runtime>", "Runtime name to remove")
  .option("--json", "Output as JSON")
  .action(async (runtime: string, options: { json?: boolean }) => {
    const config = await loadConfig();

    const entry = config.adapters[runtime];
    if (!entry) {
      if (options.json) {
        console.log(
          JSON.stringify(
            { error: `Adapter "${runtime}" is not registered` },
            null,
            2
          )
        );
        process.exit(1);
      }
      console.error(
        `Adapter "${runtime}" is not registered. Run 'tomomo adapter list' to see installed adapters.`
      );
      process.exit(1);
    }

    const installDir = join(getAdaptersDir(), runtime);
    await rm(installDir, { recursive: true, force: true });

    delete config.adapters[runtime];
    await saveConfig(config);

    if (options.json) {
      console.log(JSON.stringify({ runtime, removed: true }, null, 2));
      return;
    }

    console.log(`Adapter "${runtime}" removed.`);
  });

adapterCommand
  .command("list")
  .description("List all available adapters")
  .option("--json", "Output as JSON")
  .action(async (options: { json?: boolean }) => {
    const runtimes = await listAllRuntimes();

    if (options.json) {
      console.log(JSON.stringify(runtimes, null, 2));
      return;
    }

    if (runtimes.length === 0) {
      console.log("No adapters available.");
      return;
    }

    console.log("\nAdapters:\n");
    for (const a of runtimes) {
      const status = a.available ? "OK" : "!!";
      const pkg = a.package ? ` (${a.package})` : "";
      console.log(`  [${status}] ${a.name} [${a.type}]${pkg}`);
    }
    console.log("");
  });
