import { Command } from "commander";
import { runDiagnostics } from "@tomomo/core";

export const doctorCommand = new Command("doctor")
  .description("Check system health")
  .option("--json", "Output as JSON")
  .action(async (options) => {
    const results = await runDiagnostics();

    if (options.json) {
      console.log(JSON.stringify(results, null, 2));
      return;
    }

    console.log("\nTomomo Health Check\n");
    for (const r of results) {
      const icon = r.status === "ok" ? "OK" : r.status === "warn" ? "!!" : "XX";
      console.log(`  [${icon}] ${r.name}: ${r.message}`);
      if (r.installCommand) {
        console.log(`       Install: ${r.installCommand}`);
      }
      if (r.installUrl) {
        console.log(`       More info: ${r.installUrl}`);
      }
    }
    console.log("");
  });
