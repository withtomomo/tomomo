#!/usr/bin/env node
import { Command } from "commander";
import { version } from "@tomomo/core";
import { createCommand } from "../commands/create";
import { listCommand } from "../commands/list";
import { infoCommand } from "../commands/info";
import { editCommand } from "../commands/edit";
import { deleteCommand } from "../commands/delete";
import { cloneCommand } from "../commands/clone";
import { launchCommand } from "../commands/launch";
import { resumeCommand } from "../commands/resume";
import { doctorCommand } from "../commands/doctor";
import { memoryCommand } from "../commands/memory";
import { configCommand } from "../commands/config";
import { exportCommand } from "../commands/export";
import { importCommand } from "../commands/import";
import { adapterCommand } from "../commands/adapter";
import { skillsCommand } from "../commands/skills";
import { installCommand } from "../commands/install";
import { mcpCommand } from "../commands/mcp";

const program = new Command();

program
  .name("tomomo")
  .description("Build your AI agent team and do anything.")
  .version(version);

program.addCommand(createCommand);
program.addCommand(listCommand);
program.addCommand(infoCommand);
program.addCommand(editCommand);
program.addCommand(deleteCommand);
program.addCommand(cloneCommand);
program.addCommand(launchCommand);
program.addCommand(resumeCommand);
program.addCommand(doctorCommand);
program.addCommand(memoryCommand);
program.addCommand(configCommand);
program.addCommand(exportCommand);
program.addCommand(importCommand);
program.addCommand(adapterCommand);
program.addCommand(skillsCommand);
program.addCommand(installCommand);
program.addCommand(mcpCommand);

if (process.argv.length <= 2) {
  // No args: launch interactive TUI (handles onboarding internally)
  const { render } = await import("ink");
  const React = await import("react");
  const { App } = await import("../ui/app");
  render(React.createElement(App));
} else {
  // With args: ensure onboarding before running commands
  const { isOnboarded, runOnboarding } = await import("@tomomo/core");
  if (!(await isOnboarded())) {
    await runOnboarding();
  }
  program.parse();
}
