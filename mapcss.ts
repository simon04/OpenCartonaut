import type { Feature } from "ol";
import { fromString as colorFromString } from "ol/color";
import { Fill, Stroke, Style, Text } from "ol/style";
import CircleStyle from "ol/style/Circle";

export function evaluateStyle(
  rules: Rule[],
  feature: Feature
): Style | undefined {
  const declarations: Partial<
    Record<StyleKeys, string | number | number[] | undefined>
  > = {};
  rules.forEach((rule) => {
    const matches = rule.selectors.some((selector) =>
      matchesSelector(selector, feature)
    );
    if (!matches) return;
    rule.declaration.forEach((declaration) =>
      Object.assign(declarations, evaluateDeclaration(declaration, feature))
    );
  });

  if (Object.keys(declarations).length === 0) {
    return undefined;
  }

  const fill = declarations["fill-color"]
    ? new Fill({
        color: evaluateColor(
          declarations["fill-color"] as string,
          declarations["fill-opacity"] as number
        ),
      })
    : undefined;
  const stroke = declarations.width
    ? new Stroke({
        color: evaluateColor(
          declarations.color as string,
          declarations.opacity as number
        ),
        width: declarations.width as number,
        lineDash: declarations.dashes as number[],
        lineDashOffset: declarations["dashes-offset"] as number,
      })
    : undefined;
  const image = declarations["icon-width"]
    ? new CircleStyle({
        radius: declarations["icon-width"] as number,
        fill,
        stroke,
      })
    : undefined;
  const text = declarations.text
    ? new Text({
        fill: new Fill({
          color: evaluateColor(
            declarations["text-color"] as string,
            declarations["text-opacity"] as number
          ),
        }),
        stroke: declarations["text-halo-radius"]
          ? new Stroke({
              color: evaluateColor(
                declarations["text-halo-color"] as string,
                declarations["text-halo-opacity"] as number
              ),
              width: declarations["text-halo-radius"] as number,
            })
          : undefined,
        font:
          declarations["font-size"] && declarations["font-family"]
            ? `${declarations["font-size"]}px ${declarations["font-family"]}`
            : undefined,
        rotation: declarations["text-rotation"] as number,
        placement: declarations["text-position"] as "point" | "line",
        textAlign: declarations["text-anchor-horizontal"] as CanvasTextAlign,
        textBaseline: declarations[
          "text-anchor-vertical"
        ] as CanvasTextBaseline,
        text: declarations.text as string,
        offsetX: declarations["text-offset-x"] as number,
        offsetY: declarations["text-offset-y"] as number,
      })
    : undefined;
  return new Style({
    zIndex: declarations["z-index"] as number,
    fill,
    stroke,
    image,
    text,
  });
}
function evaluateColor(color: string, opacity: number | undefined) {
  if (!color) return undefined;
  const c = colorFromString(color);
  return typeof opacity === "number" ? [c[0], c[1], c[2], opacity] : c;
}

function matchesSelector(selector: Selector, feature: Feature) {
  return (
    matchesBase(selector.base, feature) &&
    selector.conditions.every((c) => matchesCondition(c, feature))
  );
}

function matchesBase(base: Base, feature: Feature) {
  const type = feature.getGeometry()!.getType();
  switch (base) {
    case "*":
      return true;
    case "node":
      return type === "Point" || type === "MultiPoint";
    case "way":
    case "line":
      return type === "LineString" || type === "MultiLineString";
    case "area":
      return type === "Polygon" || type === "MultiPolygon";
  }
  return false;
}

function matchesCondition(condition: Condition, feature: Feature): boolean {
  switch (condition.type) {
    case "KeyCondition":
      return matchesKeyCondition(condition, feature);
    case "KeyValueCondition":
      return matchesKeyValueCondition(condition, feature);
    case "ClassCondition":
      return matchesClassCondition(condition, feature);
  }
  return false;
}
function matchesKeyCondition(
  { key, not }: KeyCondition,
  feature: Feature
): boolean {
  const bool = Object.keys(feature.getProperties()).some((k) =>
    matchesStringOrRegExp(key, k)
  );
  return not ? !bool : bool;
}
function matchesKeyValueCondition(
  { key, value, op }: KeyValueCondition,
  feature: Feature
): boolean {
  let bool: boolean;
  switch (op) {
    case "=":
    case "!=":
      bool =
        typeof key === "string" &&
        matchesStringOrRegExp(value, feature.getProperties()[key]);
      return op === "!=" ? !bool : bool;
  }
  return false;
}
function matchesClassCondition({ cls, not }: ClassCondition, feature: Feature) {
  const bool = feature.get(`MapCSS-class-${cls}`);
  return not ? !bool : bool;
}
function matchesStringOrRegExp(key: string | RegExp, str: string): boolean {
  return key instanceof RegExp ? key.test(str) : key === str;
}

function evaluateDeclaration(declaration: Declaration, feature: Feature) {
  if (declaration.type === "SetInstruction") {
    feature.set(`MapCSS-class-${declaration.cls}`, true);
    return {};
  }
  if (declaration.key === "text" && typeof declaration.value === "string") {
    return { [declaration.key]: feature.getProperties()[declaration.value] };
  }
  return {
    [declaration.key]: evaluateExpression(declaration.value, feature),
  };
}
function evaluateExpression(
  expression: Expression,
  feature: Feature
): string | number | number[] | undefined {
  if (
    typeof expression === "string" ||
    typeof expression === "number" ||
    Array.isArray(expression)
  ) {
    return expression;
  }
  const args = expression.args.map((arg) => evaluateExpression(arg, feature));
  switch (expression.op) {
    case "+":
      return args.reduce((a, b) => a + b);
    case "-":
      return args.reduce((a, b) => a - b);
    case "*":
      return args.reduce((a, b) => a * b);
    case "/":
      return args.reduce((a, b) => a / b);
  }
  return undefined;
}

export interface Rule {
  type: "Rule";
  selectors: Selector[];
  declaration: Declaration[];
}

export interface ParentChildSelector {
  type: "ParentChildSelector";
  op: ">" | "<" | "+" | "∈" | "⊆" | "⊈" | "⊇" | "⊉" | "⧉";
  args: [ParentChildSelector, Selector];
}

export interface Selector {
  type: "Selector";
  base: Base;
  zoom?: Zoom;
  conditions: Condition[];
  subpart?: Identifier;
}

export type Base =
  | "*"
  | "node"
  | "way"
  | "relation"
  | "line"
  | "area"
  | "meta"
  | "canvas"
  | "setting";

type Zoom = {
  min?: number;
  max?: number;
};

export type Condition =
  | ExpressionCondition
  | KeyCondition
  | KeyValueCondition
  | PseudoClassCondition
  | ClassCondition;

export interface ExpressionCondition {
  type: "ExpressionCondition";
  exp: Expression;
  not: boolean;
}

export interface KeyCondition {
  type: "KeyCondition";
  key: string | RegExp;
  not: boolean;
  matchFalse: boolean;
  matchTrue: boolean;
}

export interface KeyValueCondition {
  type: "KeyValueCondition";
  key: string | RegExp;
  value: string | RegExp;
  op: "=~" | "!~" | "!=" | "=" | "~=" | "^=" | "$=" | "*=";
}

export interface PseudoClassCondition {
  type: "PseudoClassCondition";
  cls: Identifier;
  not: boolean;
}

export interface ClassCondition {
  type: "ClassCondition";
  cls: Identifier;
  not: boolean;
}

export type Declaration = Instruction | SetInstruction;

export interface Instruction {
  type: "Instruction";
  key: StyleKeys;
  value: Expression;
}

export interface SetInstruction {
  type: "SetInstruction";
  cls: Identifier;
}

type Identifier = string;
type HexColor = string;

export type Expression =
  | {
      op: string;
      args: Expression[];
    }
  | string
  | HexColor
  | number[]
  | number;

export type StyleKeys =
  | "color"
  | "dashes"
  | "dashes-background-color"
  | "dashes-background-opacity"
  | "dashes-offset"
  | "fill-color"
  | "fill-extent"
  | "fill-extent-threshold"
  | "fill-image"
  | "fill-opacity"
  | "font-family"
  | "font-size"
  | "font-style"
  | "font-weight"
  | "icon-image"
  | "icon-height"
  | "icon-offset-x"
  | "icon-offset-y"
  | "icon-opacity"
  | "icon-rotation"
  | "text-rotation"
  | "icon-width"
  | "icon-position"
  | "linecap"
  | "linejoin"
  | "major-z-index"
  | "miterlimit"
  | "modifier"
  | "object-z-index"
  | "offset"
  | "opacity"
  | "real-width"
  | "repeat-image"
  | "repeat-image-align"
  | "repeat-image-height"
  | "repeat-image-offset"
  | "repeat-image-opacity"
  | "repeat-image-phase"
  | "repeat-image-spacing"
  | "repeat-image-width"
  | "text"
  | "text-anchor-horizontal"
  | "text-anchor-vertical"
  | "text-color"
  | "text-halo-color"
  | "text-halo-opacity"
  | "text-halo-radius"
  | "text-offset"
  | "text-offset-x"
  | "text-offset-y"
  | "text-opacity"
  | "text-position"
  | "way-direction-arrows"
  | "width"
  | "z-index";
