import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
  ]),
  {
    rules: {
      // Our data-fetching hooks (useMenu/useOrders/useTracking/…) deliberately call
      // setState from a mount effect: async loaders set state after an `await`, and
      // useStaffKey hydrates from localStorage on mount. The newer react-hooks rule
      // can't prove these are async/one-time and flags them as cascading-render risks.
      // Keep it as a warning so genuinely-synchronous mistakes still surface.
      "react-hooks/set-state-in-effect": "warn",
    },
  },
]);

export default eslintConfig;
