/// <reference types="bun-types" />
import { plugin } from "bun";
import type * as peggy from "peggy";

plugin({
  name: "peggy",
  async setup(build) {
    const { readFileSync } = await import("fs");
    const { generate }: typeof peggy = (await import("peggy")).default();
    build.onLoad({ filter: /\.pegjs/ }, ({ path }) => {
      const grammar = readFileSync(path, "utf8");
      const contents = generate(grammar, { output: "parser" });
      return { exports: { default: contents }, loader: "object" };
    });
  },
});
