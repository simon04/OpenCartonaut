import { Map, View } from "ol";
import { ScaleLine } from "ol/control";
import OSMXML from "ol/format/OSMXML";
import { Tile as TileLayer, Vector as VectorLayer } from "ol/layer";
import { OSM, Vector as VectorSource } from "ol/source";
import { Rule, evaluateStyle } from "./mapcss";
import MapCSS from "./mapcss.pegjs";
import defaultMapCSS from "./default.mapcss?raw";
import "./style.css";

(document.getElementById("executeQuery") as HTMLButtonElement).onclick =
  executeQuery;
(document.getElementById("executeStyle") as HTMLButtonElement).onclick =
  executeStyle;
(document.getElementById("mapcss") as HTMLTextAreaElement).value ||=
  defaultMapCSS;

const vectorLayer = new VectorLayer({});

const map = new Map({
  target: "map",
  layers: [
    new TileLayer({
      opacity: 0.8,
      source: new OSM(),
    }),
    vectorLayer,
  ],
  view: new View({ center: [0, 0], zoom: 0 }),
  controls: [new ScaleLine()],
});

async function queryOverpass(ql: string): Promise<string> {
  const res = await fetch("https://overpass-api.de/api/interpreter", {
    method: "POST",
    body: "data=" + encodeURIComponent(ql),
  });
  return await res.text();
}

async function executeQuery() {
  const query = (document.getElementById("query") as HTMLTextAreaElement).value;
  const xml = await queryOverpass(query);
  const vectorSource = new VectorSource({
    features: new OSMXML().readFeatures(xml, {
      dataProjection: "EPSG:4326",
      featureProjection: "EPSG:3857",
    }),
  });
  vectorLayer.setSource(vectorSource);
  map.getView().fit(vectorSource.getExtent(), { padding: [24, 24, 24, 24] });
  executeStyle();
}

async function executeStyle() {
  let rules: Rule[];
  try {
    console.time("Parsing MapCSS");
    const mapcss = document.getElementById("mapcss") as HTMLTextAreaElement;
    rules = MapCSS.parse(mapcss.value);
    console.timeEnd("Parsing MapCSS");
    console.info("Parsed MapCSS", rules);
  } catch (e) {
    console.error("Failed to parse MapCSS", e);
  }
  vectorLayer
    .getSource()!
    .forEachFeature((feature) =>
      feature.setStyle(evaluateStyle(rules, feature))
    );
}
