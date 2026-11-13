import next from "eslint-config-next";

export default [
  ...next,
  { ignores: [".next/**", "node_modules/**", ".data/**", "src/components/ui/icon-paths.ts", "next-env.d.ts"] },
  {
    rules: {
      // Plain-language copy uses apostrophes heavily; React escapes JSX text safely, so this rule is noise here.
      "react/no-unescaped-entities": "off",
    },
  },
];
