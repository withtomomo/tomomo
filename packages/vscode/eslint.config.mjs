import tseslint from "typescript-eslint";

export default tseslint.config(
  {
    ignores: ["dist/", "**/*.test.ts"],
  },
  ...tseslint.configs.recommended,
  {
    languageOptions: {
      parserOptions: {
        ecmaFeatures: { jsx: true },
        tsconfigRootDir: import.meta.dirname,
      },
    },
    rules: {
      "@typescript-eslint/no-unused-vars": [
        "error",
        { argsIgnorePattern: "^_" },
      ],
    },
  },
  {
    // Extension host uses CJS require() for vendor modules
    files: ["src/pty-manager.ts"],
    rules: {
      "@typescript-eslint/no-require-imports": "off",
    },
  }
);
