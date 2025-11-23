import { type Plugin, defineConfig, createFilter } from "rolldown-vite";
import _peggy from "peggy";

export default defineConfig({
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
