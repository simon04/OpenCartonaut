import { type Plugin, defineConfig, createFilter } from "vite-plus";
import _peggy from "peggy";

export default defineConfig({
  staged: {
    "*": "vp check --fix",
  },
  fmt: {},
  lint: {
    jsPlugins: [{ name: "vite-plus", specifier: "vite-plus/oxlint-plugin" }],
    rules: { "vite-plus/prefer-vite-plus-imports": "error" },
    options: { typeAware: true, typeCheck: true },
  },
  build: {
    sourcemap: true,
  },
  plugins: [peggy()],
});

function peggy(options: _peggy.ParserBuildOptions = {}): Plugin {
  return {
    name: "peggy",
    transform(grammar, id) {
      const { include = ["*.pegjs", "**/*.pegjs"], exclude } = options;
      const filter = createFilter(include, exclude);
      if (!filter(id)) return null;
      const code = _peggy.generate(grammar, { output: "source", ...options });
      return {
        code: `export default ${code};`,
        map: { mappings: "" },
      };
    },
  };
}
