/// <reference types="bun-types" />
import { expect, test } from "bun:test";
import "./bunPeggyPlugin";
import { readFileSync } from "fs";
import { evaluateRules, parseMapCSS } from "./mapcss";
import { Point } from "ol/geom";

test("text", () => {
  const mapcss = readFileSync("./railway.mapcss", "utf8");
  const rules = parseMapCSS(mapcss);
  const station = new Point([15.655048, 48.597765]);
  station.setProperties({ name: "Gars-Thunau", railway: "station" });
  const declarations = evaluateRules(rules, station);
  expect(declarations).toEqual({
    color: "white",
    "fill-color": "#dc0000",
    "fill-opacity": 1,
    font: "bold 12pt / 1.0 Noto Sans ",
    "icon-width": 6,
    opacity: 1,
    text: "Gars-Thunau",
    "text-anchor-horizontal": "right",
    "text-anchor-vertical": "bottom",
    "text-color": "#dc0000",
    "text-halo-color": "white",
    "text-halo-opacity": 0.8,
    "text-halo-radius": 2,
    "text-offset-x": -5,
    width: 1,
  });
});

test("arithmetic", () => {
  const rules = parseMapCSS("* {value: -2.7 > +3 ? 12 : 2 * (3 + 4);}");
  const declarations = evaluateRules(rules, undefined);
  expect(declarations).toEqual({ value: 14 });
});
