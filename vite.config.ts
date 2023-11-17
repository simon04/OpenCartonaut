import { type Plugin, defineConfig, createFilter } from "vite";
import { type ParserBuildOptions, generate } from "peggy";

export default defineConfig({
  build: {
    sourcemap: true,
  },
  plugins: [peggy()],
});

function peggy(options: ParserBuildOptions = {}): Plugin {
  return {
    name: "peggy",
    transform(grammar, id) {
      const { include = ["*.pegjs", "**/*.pegjs"], exclude } = options;
      const filter = createFilter(include, exclude);
      if (!filter(id)) return null;
      const code = generate(grammar, { output: "source", ...options });
      return {
        code: `export default ${code};`,
        map: { mappings: "" },
      };
    },
  };
}
