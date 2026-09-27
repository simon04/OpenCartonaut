/// <reference types="node" />
import assert from "node:assert/strict";
import { test } from "node:test";
import { readFileSync } from "fs";
import { evaluateRules, parseMapCSS } from "./mapcss";
import { Point } from "ol/geom";

test("text", () => {
  const mapcss = readFileSync(`${import.meta.dirname}/railway.mapcss`, "utf8");
  const rules = parseMapCSS(mapcss);
  const station = new Point([15.655048, 48.597765]);
  station.setProperties({ name: "Gars-Thunau", railway: "station" });
  const declarations = evaluateRules(rules, station);
  assert.deepEqual(declarations, {
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

test("string", () => {
  const mapcss = readFileSync(`${import.meta.dirname}/mapcss.spec.quoting.mapcss`, "utf8");
  const rules = parseMapCSS(mapcss);
  const declarations = evaluateRules(rules, new Point([]));
  assert.deepEqual(declarations, {
    string: 'foo"bar\\baz\nnew\ttab',
    eval: 'foo"bar\\baz\nnew\ttab',
  });
});

test("arithmetic", () => {
  const rules = parseMapCSS("* {value: -2.7 > +3 ? 12 : 2 * (3 + 4);}");
  const declarations = evaluateRules(rules, new Point([]));
  assert.deepEqual(declarations, { value: 14 });
});
