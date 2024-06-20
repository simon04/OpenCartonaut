import { Map, View } from "ol";
import { ScaleLine } from "ol/control";
import { useGeographic } from "ol/proj";
import { Tile as TileLayer } from "ol/layer";
import { OSM } from "ol/source";
import defaultMapCSS from "./default.mapcss?raw";
import OverpassVectorLayer from "./OverpassVectorLayer";
import "./style.css";
import { evaluateCanvas } from "./mapcss";

useGeographic();
const vectorLayer = new OverpassVectorLayer({});
const tileLayer = new TileLayer({
  source: new OSM(),
  className: "ol-layer-osm",
});

const queryTextarea = document.getElementById("query") as HTMLTextAreaElement;
const mapcssTextarea = document.getElementById("mapcss") as HTMLTextAreaElement;

const defaultQuery = `
/// @subpart foreground
relation(4740507);>;out geom;
/// @subpart background
//nwr[railway=rail]({{bbox}});out geom;
/// @subpart town
/// @type geojson
{
  "type": "FeatureCollection",
  "features": [
    {
      "type": "Feature",
      "properties": { "name": "Gars am Kamp", "place": "town" },
      "geometry": { "type": "Point", "coordinates": [15.6594592, 48.5951053] }
    }
  ]
}
`.trim();
const store = new (class Store {
  get query(): string {
    return localStorage.getItem("overpass-ol.query") || defaultQuery;
  }
  set query(value: string) {
    localStorage.setItem("overpass-ol.query", value);
    this.updateURL();
  }
  get mapcss(): string {
    return localStorage.getItem("overpass-ol.mapcss") || defaultMapCSS;
  }
  set mapcss(value: string) {
    localStorage.setItem("overpass-ol.mapcss", value);
    this.updateURL();
  }
  updateURL() {
    location.hash = new URLSearchParams({
      query: this.query,
      mapcss: this.mapcss,
    }).toString();
  }
})();

const searchParams = new URLSearchParams(location.hash.slice(1));
store.query = searchParams.get("query") || store.query;
store.mapcss = searchParams.get("mapcss") || store.mapcss;

queryTextarea.value ||= store.query;
mapcssTextarea.value ||= store.mapcss;

queryTextarea.addEventListener(
  "keydown",
  (e) => (e.ctrlKey || e.metaKey) && e.key === "Enter" && executeQueryClick(),
);
mapcssTextarea.addEventListener(
  "keydown",
  (e) => (e.ctrlKey || e.metaKey) && e.key === "Enter" && executeStyleClick(),
);

const executeQueryButton = document.getElementById(
  "executeQuery",
) as HTMLButtonElement;
executeQueryButton.addEventListener("click", executeQueryClick);
async function executeQueryClick() {
  try {
    executeQueryButton.className = "pending";
    await vectorLayer.executeQuery(queryTextarea.value);
    executeQueryButton.className = "success";
    store.query = queryTextarea.value;
  } catch (error) {
    executeQueryButton.title = error?.message || String(error);
    executeQueryButton.className = "error";
    console.error(error);
  }
  executeStyleClick();
}

const executeStyleButton = document.getElementById(
  "executeStyle",
) as HTMLButtonElement;
executeStyleButton.addEventListener("click", executeStyleClick);
async function executeStyleClick() {
  try {
    executeStyleButton.className = "pending";
    const rules = vectorLayer.executeStyle(mapcssTextarea.value);
    executeStyleButton.className = "success";
    store.mapcss = mapcssTextarea.value;
    evaluateCanvas(rules, tileLayer);
  } catch (error) {
    executeStyleButton.title = error?.message || String(error);
    executeStyleButton.className = "error";
    console.error(error);
  }
}

export const map = new Map({
  target: "map",
  layers: [tileLayer, vectorLayer],
  view: new View({ center: [0, 0], zoom: 0 }),
  controls: [new ScaleLine()],
});
