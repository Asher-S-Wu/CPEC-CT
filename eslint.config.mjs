import nextCoreWebVitals from "eslint-config-next/core-web-vitals";
import nextTypescript from "eslint-config-next/typescript";

const config = [
  {
    ignores: [".next/**", "node_modules/**", "CPEC-VA/**"],
  },
  ...nextCoreWebVitals,
  ...nextTypescript,
  {
    rules: {
      "no-console": "error",
    },
  },
  {
    files: ["lib/logger.js"],
    rules: {
      "no-console": "off",
    },
  },
];

export default config;
