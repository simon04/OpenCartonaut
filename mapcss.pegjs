/*
 * Parser definition for the main MapCSS parser:
 *
 * <pre>
 *
 *                       rule
 *  _______________________|______________________________
 * |                                                      |
 *        selector                      declaration
 *  _________|___________________   _________|____________
 * |                             | |                      |
 *
 * way|z11-12[highway=residential] { color: red; width: 3 }
 *
 *    |_____||___________________|   |_________|
 *       |            |                   |
 *     zoom       condition          instruction
 *
 * more general:
 *
 * way|z13-[a=b][c=d]::subpart, way|z-3[u=v]:closed::subpart2 { p1 : val; p2 : val; }
 *
 * 'val' can be a literal, or an expression like "prop(width, default) + 0.8".
 *
 * </pre>
 */
Rules = (_ @Rule _)|..|
Rule "rule"
  = selectors:Selectors _ declaration:Declaration
  { return {type: "Rule", selectors, declaration}; }

Selectors
  = ParentChildSelector|..,(_ "," _)|
ParentChildSelector
  = head:Selector tail:(_ (child:">" / parent:"<" / sibling:"+" / memberOf:"∈" / subset:"⊆" / notSubset:"⊈" / superset:"⊇" / notSuperset:"⊉" / crossing:"⧉")? _ Selector)*
  { return tail.reduce((arg1, [, op, , arg2]) => ({type: "ParentChildSelector", op, args: [arg1, arg2]}), head); }
Selector "selector" =
  base:Base
  zoom:Zoom?
  conditions:Condition*
  subpart:Subpart?
  { return {type: "Selector", base, zoom, conditions, subpart}; }

Base "base selector" = "*" / "node" / "way" / "relation" / "line" / "area" / "meta" / "canvas" / "setting"
Subpart "subpart" = "::" @Identifier
Zoom "zoom" = "|z" @(
  min:Integer "-" max:Integer { return {min, max}; }
  / min:Integer "-" { return {min}; }
  / "-" max:Integer { return {max}; }
  / min:Integer { return {min, max: min}; }
  )

Condition "condition"
  = PseudoClassCondition
  / ClassCondition
  / "[" _ @ExpressionCondition _ "]"
  / "[" _ @KeyCondition _ "]"
  / "[" _ @KeyValueCondition _ "]"
ExpressionCondition =
  not:"!"?
  exp:Expression
  { return {type: "ExpressionCondition", not, exp}; }
KeyCondition =
  not:"!"?
  key:(TagKey / RegExp)
  matchFalse:"?!"?
  matchTrue:"?"?
  { return {type: "KeyCondition", not, key, matchFalse, matchTrue}; }
KeyValueCondition =
  key:(TagKey / RegExp)
  _
  op:(regex:"=~" / nregex:"!~" / neq:"!=" / eq:"="/ oneOf:"~=" / startsWith:"^=" / endsWith:"$=" / contains:"*=")
  _
  value:(TagKey / RegExp / Expression / "*")
  { return {type: "KeyValueCondition", key, op, value}; }
PseudoClassCondition
  = not:"!"? ":" cls:Identifier
  { return {type: "PseudoClassCondition", not, cls}; }
ClassCondition
  = not:"!"? "." cls:Identifier
  { return {type: "ClassCondition", not, cls}; }

Declaration "declaration"
  = "{" _ @Instructions? _ "}"
Instructions
  = @(SetInstruction / Instruction)|..,(_ ";" _)| _ ";"?
Instruction "instruction"
  = key:Identifier _ ":" _ value:Expression
  { return {type: "Instruction", key, value}; }
SetInstruction
  = "set" [ \t\n\r] _ "."? cls:Identifier
  { return {type: "SetInstruction", cls}; } 

Identifier "identifier"
  = [a-zA-Z_] [a-zA-Z_0-9-]*
  { return text(); }
String "string"
  = "\"" ( [ !#-[\]-~\u0080-\uFFFF] / "\\\"" / "\\\\" )*  "\""
  { return text().slice(1, -1); }
RegExp "regex"
  = "/" ("\\/" / [^/])* "/"
  { return new RegExp(text().slice(1, -1)); }
TagKey "tag key"
  = String / Identifier (":" Identifier)*
  { return text(); }

Expression
  = head:Term tail:(_ ("+" / "-") _ Term)*
  { return tail.reduce((arg1, [, op, , arg2]) => ({op, args: [arg1, arg2]}), head); }
Term 
  = head:Factor tail:(_ ("*" / "/") _ Factor)* 
  { return tail.reduce((arg1, [, op, , arg2]) => ({op, args: [arg1, arg2]}), head); }
Factor
  = "(" _ @Expression _ ")"
  / @Function
  / @String
  / name:Identifier @HexColor
  / @HexColor
  / @Identifier
  / @FloatArray
  / @FloatUnit

Function
  = op:Identifier _ "(" args:FunctionArgs? _ ")"
  { return {op, args}; }
FunctionArgs
  = Expression|..,(_ "," _)|

Integer "integer"
  = [-+0-9]+
  { return parseInt(text()); }
Float "float"
  = [-+.0-9]+
  { return parseFloat(text()); }
FloatUnit
  = value:Float unit:Unit?
  { return value * unit; }
FloatArray 
  = Float|2..,(_ "," _)|
Unit
  = "1" { return 1; }
  / "deg" { return Math.PI / 180; }
  / "°" { return Math.PI / 180; }
  / "rad" { return 1.; }
  / "grad" { return Math.PI / 200; }
  / "turn" { return 2 * Math.PI; }
  / "%" { return 0.01; }
  / "px" { return 1.; }
  / "cm" { return 96 / 2.54; }
  / "mm" { return 9.6 / 2.54; }
  / "in" { return 96.; }
  / "q" { return 2.4 / 2.54; }
  / "pc" { return 16.; }
  / "pt" { return 96. / 72; }
HexColor 
  = "#" ([0-9a-fA-F])|8| { return text(); }
  / "#" ([0-9a-fA-F])|6| { return text(); }
  / "#" ([0-9a-fA-F])|3| { return text(); }

_ "whitespace"
  = ( SingleComment / MultiComment / [ \t\n\r] )*
  { return undefined; }
SingleComment = "//" [^\n]*
MultiComment = "/*" ( !"*/" ( [^\n\r] / "\n" / "\r" ) )* "*/"
