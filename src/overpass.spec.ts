/// <reference types="node" />
import assert from "node:assert/strict";
import { test } from "node:test";
import { splitQuerySubpart } from "./overpass";

test("splitQuerySubpart none", () => {
  const query = `relation(4740507);>;out geom;`;
  return assert.deepEqual(splitQuerySubpart(query), [
    {
      query: "relation(4740507);>;out geom;",
      subpart: undefined,
      start: 0,
    },
  ]);
});

test("splitQuerySubpart background", () => {
  const query = `
relation(4740507);>;out geom;
/// @subpart background
nwr[railway=rail]({{bbox}});out geom;
`;
  return assert.deepEqual(splitQuerySubpart(query), [
    {
      query: "relation(4740507);>;out geom;",
      subpart: undefined,
      start: 0,
    },
    {
      query: "/// @subpart background\nnwr[railway=rail]({{bbox}});out geom;",
      subpart: "background",
      start: 30,
    },
  ]);
});

test("splitQuerySubpart foreground/background", () => {
  const query = `
/// @subpart foreground
relation(4740507);>;out geom;
/// @subpart background
nwr[railway=rail]({{bbox}});out geom;
`;
  return assert.deepEqual(splitQuerySubpart(query), [
    {
      query: "/// @subpart foreground\nrelation(4740507);>;out geom;\n",
      subpart: "foreground",
      start: 0,
    },
    {
      query: "/// @subpart background\nnwr[railway=rail]({{bbox}});out geom;",
      subpart: "background",
      start: 54,
    },
  ]);
});
