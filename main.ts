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

const queryTextarea = document.getElementById("query") as HTMLTextAreaElement;
const mapcssTextarea = document.getElementById("mapcss") as HTMLTextAreaElement;

const defaultQuery = `
/// @subpart foreground
relation(4740507);>;out geom;
/// @subpart background
//nwr[railway=rail]({{bbox}});out geom;
`.trim();
const store = new (class Store {
  get query(): string {
    return (
      new URLSearchParams(location.hash.slice(1)).query ||
      localStorage.getItem("overpass-ol.query") ||
      defaultQuery
    );
  }
  set query(value: string) {
    localStorage.setItem("overpass-ol.query", value);
    this.updateURL();
  }
  get mapcss(): string {
    return (
      new URLSearchParams(location.hash.slice(1)).mapcss ||
      localStorage.getItem("overpass-ol.mapcss") ||
      defaultMapCSS
    );
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

queryTextarea.value ||= store.query;
mapcssTextarea.value ||= store.mapcss;

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
    store.query = queryTextarea.value;
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
    const rules = vectorLayer.executeStyle(mapcssTextarea.value);
    executeStyleButton.className = "success";
    store.mapcss = mapcssTextarea.value;

    const canvas = evaluateCanvas(rules);
    map.getLayers().forEach((layer) => {
      if (!(layer instanceof TileLayer)) return;
      layer.setOpacity(
        typeof canvas.opacity === "number" ? canvas.opacity : 1.0
      );
      layer.setBackground(
        typeof canvas["fill-color"] === "string"
          ? canvas["fill-color"]
          : undefined
      );
      document.body.style.setProperty(
        "--ol-layer-osm-filter",
        canvas["fill-filter"]
      );
      const source = layer.getSource() as OSM;
      typeof canvas["fill-image"] === "string" &&
        source.setUrl(canvas["fill-image"]);
    });
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
      source: new OSM(),
      className: "ol-layer-osm",
    }),
    vectorLayer,
  ],
  view: new View({ center: [0, 0], zoom: 0 }),
  controls: [new ScaleLine()],
});
