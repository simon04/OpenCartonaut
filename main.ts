import { Map, View } from "ol";
import { ScaleLine } from "ol/control";
import { useGeographic } from "ol/proj";
import OSMXML from "./OSMXML";
import { Tile as TileLayer, Vector as VectorLayer } from "ol/layer";
import { OSM, Vector as VectorSource } from "ol/source";
import { evaluateStyle, parseMapCSS } from "./mapcss";
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
      console.error(error);
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
      console.error(error);
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
    headers: {
      "Content-Type": "application/x-www-form-urlencoded; charset=UTF-8",
    },
    body: "data=" + encodeURIComponent(ql),
  });
  if (!res.ok) {
    const lines = (await res.text()).split("\n");
    throw new Error(lines.find((line) => line.includes("Error")));
  }
  return await res.text();
}

async function executeQuery(query: string) {
  const [minx, miny, maxx, maxy] = map.getView().calculateExtent();
  query = query.replaceAll("{{bbox}}", [miny, minx, maxy, maxx].join(","));
  const xml = await queryOverpass(query);
  const vectorSource = new VectorSource({
    features: new OSMXML().readFeatures(xml),
  });
  vectorLayer.setSource(vectorSource);
  map.getView().fit(vectorSource.getExtent(), { padding: [24, 24, 24, 24] });
}

function executeStyle(mapcss: string) {
  try {
    const rules = parseMapCSS(mapcss);
    console.info("Parsed MapCSS", rules);
    const vectorSource = vectorLayer.getSource();
    vectorSource.forEachFeature((feature) =>
      feature.setStyle(evaluateStyle(rules, feature))
    );
  } catch (e) {
    console.error("Failed to parse MapCSS", e);
  }
}
