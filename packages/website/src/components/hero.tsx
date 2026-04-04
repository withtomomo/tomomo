"use client";

import { Button } from "@tomomo/ui";
import { Characters } from "./characters";

export function Hero() {
  return (
    <section className="relative flex h-screen items-center justify-center overflow-hidden">
      <Characters />

      <div className="relative z-10 flex -translate-y-2 flex-col items-center px-6 text-center">
        <div className="mb-6 flex items-center gap-3 max-md:flex-col max-md:gap-2">
          <img
            src="/icon-light.png"
            alt=""
            className="dark-only h-16 w-16 max-md:h-24 max-md:w-24"
          />
          <img
            src="/icon-dark.png"
            alt=""
            className="light-only h-16 w-16 max-md:h-24 max-md:w-24"
          />
          <span className="text-fg-1 text-4xl font-bold tracking-tight max-md:text-4xl">
            tomomo
          </span>
        </div>

        <h1 className="text-fg-1 mb-3 text-[56px] leading-[1.05] font-bold tracking-[-0.03em] max-md:text-[28px] max-md:leading-[1.15]">
          Build your AI agent team
          <br />
          and do anything
        </h1>
        <p className="text-fg-3 mb-6 text-lg max-md:text-base">
          Agents with personality, memory, and their own character
        </p>

        <div className="flex flex-wrap justify-center gap-4 max-md:w-full max-md:max-w-[320px] max-md:flex-col max-md:items-stretch max-md:gap-3">
          <a
            href="https://github.com/withtomomo/tomomo/releases/latest"
            className="max-md:w-full"
          >
            <Button variant="accent" size="xl" className="max-md:w-full">
              Download
            </Button>
          </a>
          <div className="contents max-md:!flex max-md:gap-3">
            <a
              href="https://marketplace.visualstudio.com/items?itemName=tomomo.tomomo-vscode"
              className="max-md:flex-1"
            >
              <Button
                variant="primary"
                size="xl"
                className="max-md:h-12 max-md:w-full max-md:px-4 max-md:text-base"
              >
                VS Code
              </Button>
            </a>
            <a
              href="https://github.com/withtomomo/tomomo"
              target="_blank"
              rel="noopener noreferrer"
              className="max-md:flex-1"
            >
              <Button
                variant="ghost"
                size="xl"
                className="!bg-bg-2 !text-fg-1 hover:!bg-bg-3 max-md:h-12 max-md:w-full max-md:px-4 max-md:text-base"
              >
                GitHub
              </Button>
            </a>
          </div>
        </div>
      </div>
    </section>
  );
}
