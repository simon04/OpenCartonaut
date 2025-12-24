import { Map, View } from "ol";
import { ScaleLine } from "ol/control";
import { useGeographic } from "ol/proj";
import { Tile as TileLayer } from "ol/layer";
import { OSM } from "ol/source";
import OverpassVectorLayer from "./OverpassVectorLayer";
import "../style.css";
import { evaluateCanvas } from "./mapcss";
import { STORE } from "./store";

useGeographic();
const vectorLayer = new OverpassVectorLayer({});
const tileLayer = new TileLayer({
  source: new OSM(),
  className: "ol-layer-osm",
});

const queryTextarea = document.getElementById("query") as HTMLTextAreaElement;
const mapcssTextarea = document.getElementById("mapcss") as HTMLTextAreaElement;

const searchParams = new URLSearchParams(location.hash.slice(1));
STORE.query = searchParams.get("query") || STORE.query;
STORE.mapcss = searchParams.get("mapcss") || STORE.mapcss;

queryTextarea.value ||= STORE.query;
mapcssTextarea.value ||= STORE.mapcss;

queryTextarea.addEventListener(
  "keydown",
  (e) => (e.ctrlKey || e.metaKey) && e.key === "Enter" && executeQueryClick(),
);
mapcssTextarea.addEventListener(
  "keydown",
  (e) => (e.ctrlKey || e.metaKey) && e.key === "Enter" && executeStyleClick(),
);

const executeQueryButton = document.getElementById("executeQuery") as HTMLButtonElement;
executeQueryButton.addEventListener("click", executeQueryClick);
async function executeQueryClick() {
  try {
    executeQueryButton.className = "pending";
    await vectorLayer.executeQuery(queryTextarea.value);
    executeQueryButton.className = "success";
    STORE.query = queryTextarea.value;
  } catch (error) {
    executeQueryButton.title = error?.message || String(error);
    executeQueryButton.className = "error";
    console.error(error);
  }
  executeStyleClick();
}

const executeStyleButton = document.getElementById("executeStyle") as HTMLButtonElement;
executeStyleButton.addEventListener("click", executeStyleClick);
async function executeStyleClick() {
  try {
    executeStyleButton.className = "pending";
    const rules = vectorLayer.executeStyle(mapcssTextarea.value);
    executeStyleButton.className = "success";
    STORE.mapcss = mapcssTextarea.value;
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
