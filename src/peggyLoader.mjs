// Node.js module hooks for running tests, mimicking vite.config.ts:
// resolve extensionless imports and import *.pegjs grammars
import { registerHooks } from "node:module";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import peggy from "peggy";

registerHooks({
  resolve(specifier, context, nextResolve) {
    try {
      return nextResolve(specifier, context);
    } catch (error) {
      if (!["ERR_MODULE_NOT_FOUND", "ERR_UNSUPPORTED_DIR_IMPORT"].includes(error.code)) throw error;
      const extension = specifier.startsWith(".") ? ".ts" : ".js";
      return nextResolve(specifier + extension, context);
    }
  },
  load(url, context, nextLoad) {
    if (!url.endsWith(".pegjs")) return nextLoad(url, context);
    const grammar = readFileSync(fileURLToPath(url), "utf8");
    const code = peggy.generate(grammar, { output: "source" });
    return { format: "module", source: `export default ${code};`, shortCircuit: true };
  },
});
