import { Map, View } from "ol";
import { ScaleLine } from "ol/control";
import { useGeographic } from "ol/proj";
import OSMXML from "ol/format/OSMXML";
import { Tile as TileLayer, Vector as VectorLayer } from "ol/layer";
import { OSM, Vector as VectorSource } from "ol/source";
import { Rule, evaluateStyle } from "./mapcss";
import MapCSS from "./mapcss.pegjs";
import defaultMapCSS from "./default.mapcss?raw";
import "./style.css";

useGeographic();

const queryTextarea = document.getElementById("query") as HTMLTextAreaElement;
const mapcssTextarea = document.getElementById("mapcss") as HTMLTextAreaElement;

const defaultQuery = `
relation(4740507);
(._;>;);
out geom;`.trim();
queryTextarea.value ||=
  localStorage.getItem("overpass-ol.query") || defaultQuery;

mapcssTextarea.value ||=
  localStorage.getItem("overpass-ol.mapcss") || defaultMapCSS;

document
  .getElementById("executeQuery")!
  .addEventListener("click", async function (e) {
    try {
      this.className = "pending";
      await executeQuery(queryTextarea.value);
      this.className = "success";
      localStorage.setItem("overpass-ol.query", queryTextarea.value);
    } catch (error) {
      this.title = error?.message || String(error);
      this.className = "error";
    }
    document.getElementById("executeStyle")?.dispatchEvent(e);
  });

document
  .getElementById("executeStyle")!
  .addEventListener("click", async function () {
    try {
      this.className = "pending";
      await executeStyle(mapcssTextarea.value);
      this.className = "success";
      localStorage.setItem("overpass-ol.mapcss", mapcssTextarea.value);
    } catch (error) {
      this.title = error?.message || String(error);
      this.className = "error";
    }
  });

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
  if (!res.ok) {
    const lines = (await res.text()).split("\n");
    throw new Error(lines.find((line) => line.includes("Error")));
  }
  return await res.text();
}

async function executeQuery(query: string) {
  const xml = await queryOverpass(query);
  const vectorSource = new VectorSource({
    features: new OSMXML().readFeatures(xml),
  });
  vectorLayer.setSource(vectorSource);
  map.getView().fit(vectorSource.getExtent(), { padding: [24, 24, 24, 24] });
}

async function executeStyle(mapcss: string) {
  let rules: Rule[] = [];
  try {
    console.time("Parsing MapCSS");
    rules = MapCSS.parse(mapcss);
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
