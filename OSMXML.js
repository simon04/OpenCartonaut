/**
 * @module ol/format/OSMXML
 */
// FIXME add typedef for stack state objects
import Feature from "ol/Feature.js";
import LineString from "ol/geom/LineString.js";
import Point from "ol/geom/Point.js";
import Polygon from "ol/geom/Polygon.js";
import XMLFeature from "ol/format/XMLFeature.js";
import { extend } from "ol/array.js";
import { get as getProjection } from "ol/proj.js";
import { isEmpty } from "ol/obj.js";
import { makeStructureNS, pushParseAndPop } from "ol/xml.js";
import { transformGeometryWithOptions } from "ol/format/Feature.js";

/**
 * @const
 * @type {Array<null>}
 */
const NAMESPACE_URIS = [null];

/**
 * @const
 * @type {Object<string, Object<string, import("ol/xml.js").Parser>>}
 */
// @ts-ignore
const WAY_PARSERS = makeStructureNS(NAMESPACE_URIS, {
  nd: readNd,
  tag: readTag,
});

/**
 * @const
 * @type {Object<string, Object<string, import("ol/xml.js").Parser>>}
 */
// @ts-ignore
const PARSERS = makeStructureNS(NAMESPACE_URIS, {
  node: readNode,
  way: readWay,
});

/**
 * @classdesc
 * Feature format for reading data in the
 * [OSMXML format](https://wiki.openstreetmap.org/wiki/OSM_XML).
 *
 * @api
 */
class OSMXML extends XMLFeature {
  constructor() {
    super();

    /**
     * @type {import("ol/proj/Projection.js").default}
     */
    this.dataProjection = getProjection("EPSG:4326");
  }

  /**
   * @protected
   * @param {Element} node Node.
   * @param {import("ol/format/Feature.js").ReadOptions} [options] Options.
   * @return {Array<import("ol/Feature.js").default>} Features.
   */
  readFeaturesFromNode(node, options) {
    options = this.getReadOptions(node, options);
    if (node.localName == "osm") {
      const state = pushParseAndPop(
        {
          nodes: {},
          ways: [],
          features: [],
        },
        PARSERS,
        node,
        [options],
      );
      // parse nodes in ways
      for (let j = 0; j < state.ways.length; j++) {
        const values = /** @type {Object} */ (state.ways[j]);
        /** @type {Array<number>} */
        const flatCoordinates = values.flatCoordinates;
        if (!flatCoordinates.length) {
          for (let i = 0, ii = values.ndrefs.length; i < ii; i++) {
            const point = state.nodes[values.ndrefs[i]];
            extend(flatCoordinates, point);
          }
        }
        let geometry;
        if (values.ndrefs[0] == values.ndrefs[values.ndrefs.length - 1]) {
          // closed way
          geometry = new Polygon(flatCoordinates, "XY", [
            flatCoordinates.length,
          ]);
        } else {
          geometry = new LineString(flatCoordinates, "XY");
        }
        transformGeometryWithOptions(geometry, false, options);
        const feature = new Feature(geometry);
        if (values.id !== undefined) {
          feature.setId(values.id);
        }
        feature.setProperties(values.tags, true);
        state.features.push(feature);
      }
      if (state.features) {
        return state.features;
      }
    }
    return [];
  }
}

/**
 * @const
 * @type {Object<string, Object<string, import("ol/xml.js").Parser>>}
 */
// @ts-ignore
const NODE_PARSERS = makeStructureNS(NAMESPACE_URIS, {
  tag: readTag,
});

/**
 * @param {Element} node Node.
 * @param {Array<*>} objectStack Object stack.
 */
function readNode(node, objectStack) {
  const options = /** @type {import("ol/format/Feature.js").ReadOptions} */ (
    objectStack[0]
  );
  const state = /** @type {Object} */ (objectStack[objectStack.length - 1]);
  const id = node.getAttribute("id");
  /** @type {import("ol/coordinate.js").Coordinate} */
  const coordinates = [
    parseFloat(node.getAttribute("lon")),
    parseFloat(node.getAttribute("lat")),
  ];
  state.nodes[id] = coordinates;

  const values = pushParseAndPop(
    {
      tags: {},
    },
    NODE_PARSERS,
    node,
    objectStack,
  );
  if (!isEmpty(values.tags)) {
    const geometry = new Point(coordinates);
    transformGeometryWithOptions(geometry, false, options);
    const feature = new Feature(geometry);
    if (id !== undefined) {
      feature.setId(id);
    }
    feature.setProperties(values.tags, true);
    state.features.push(feature);
  }
}

/**
 * @param {Element} node Node.
 * @param {Array<*>} objectStack Object stack.
 */
function readWay(node, objectStack) {
  const id = node.getAttribute("id");
  const values = pushParseAndPop(
    {
      id: id,
      ndrefs: [],
      flatCoordinates: [],
      tags: {},
    },
    WAY_PARSERS,
    node,
    objectStack,
  );
  const state = /** @type {Object} */ (objectStack[objectStack.length - 1]);
  state.ways.push(values);
}

/**
 * @param {Element} node Node.
 * @param {Array<*>} objectStack Object stack.
 */
function readNd(node, objectStack) {
  const values = /** @type {Object} */ (objectStack[objectStack.length - 1]);
  values.ndrefs.push(node.getAttribute("ref"));
  if (node.hasAttribute("lon") && node.hasAttribute("lat")) {
    values.flatCoordinates.push(parseFloat(node.getAttribute("lon")));
    values.flatCoordinates.push(parseFloat(node.getAttribute("lat")));
  }
}

/**
 * @param {Element} node Node.
 * @param {Array<*>} objectStack Object stack.
 */
function readTag(node, objectStack) {
  const values = /** @type {Object} */ (objectStack[objectStack.length - 1]);
  values.tags[node.getAttribute("k")] = node.getAttribute("v");
}

export default OSMXML;
