import { Map, View } from "ol";
import { ScaleLine } from "ol/control";
import { useGeographic } from "ol/proj";
import { Tile as TileLayer } from "ol/layer";
import { OSM } from "ol/source";
import defaultMapCSS from "./default.mapcss?raw";
import OverpassVectorLayer from "./OverpassVectorLayer";
import "./style.css";

useGeographic();
const vectorLayer = new OverpassVectorLayer({});

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

queryTextarea.addEventListener(
  "keydown",
  (e) => (e.ctrlKey || e.metaKey) && e.key === "Enter" && executeQueryClick()
);
mapcssTextarea.addEventListener(
  "keydown",
  (e) => (e.ctrlKey || e.metaKey) && e.key === "Enter" && executeStyleClick()
);

const executeQueryButton = document.getElementById(
  "executeQuery"
) as HTMLButtonElement;
executeQueryButton.addEventListener("click", executeQueryClick);
async function executeQueryClick() {
  try {
    executeQueryButton.className = "pending";
    await vectorLayer.executeQuery(queryTextarea.value);
    executeQueryButton.className = "success";
    localStorage.setItem("overpass-ol.query", queryTextarea.value);
  } catch (error) {
    executeQueryButton.title = error?.message || String(error);
    executeQueryButton.className = "error";
    console.error(error);
  }
  executeStyleClick();
}

const executeStyleButton = document.getElementById(
  "executeStyle"
) as HTMLButtonElement;
executeStyleButton.addEventListener("click", executeStyleClick);
async function executeStyleClick() {
  try {
    executeStyleButton.className = "pending";
    await vectorLayer.executeStyle(mapcssTextarea.value);
    executeStyleButton.className = "success";
    localStorage.setItem("overpass-ol.mapcss", mapcssTextarea.value);
  } catch (error) {
    executeStyleButton.title = error?.message || String(error);
    executeStyleButton.className = "error";
    console.error(error);
  }
}

export const map = new Map({
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
