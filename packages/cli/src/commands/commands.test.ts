import { describe, it, expect } from "vitest";
import { createCommand } from "./create";
import { listCommand } from "./list";
import { infoCommand } from "./info";
import { editCommand } from "./edit";
import { deleteCommand } from "./delete";
import { cloneCommand } from "./clone";
import { launchCommand } from "./launch";
import { resumeCommand } from "./resume";
import { doctorCommand } from "./doctor";
import { memoryCommand } from "./memory";
import { exportCommand } from "./export";
import { importCommand } from "./import";
import { installCommand } from "./install";

describe("all commands have --json", () => {
  const commands = [
    { name: "create", cmd: createCommand },
    { name: "list", cmd: listCommand },
    { name: "info", cmd: infoCommand },
    { name: "edit", cmd: editCommand },
    { name: "delete", cmd: deleteCommand },
    { name: "clone", cmd: cloneCommand },
    { name: "launch", cmd: launchCommand },
    { name: "resume", cmd: resumeCommand },
    { name: "doctor", cmd: doctorCommand },
    { name: "memory", cmd: memoryCommand },
    { name: "export", cmd: exportCommand },
    { name: "import", cmd: importCommand },
    { name: "install", cmd: installCommand },
  ];

  for (const { name, cmd } of commands) {
    it(`${name} has --json option`, () => {
      const options = cmd.options.map((o) => o.long);
      expect(options).toContain("--json");
    });
  }
});
