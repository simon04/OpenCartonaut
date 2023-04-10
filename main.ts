import { Map, View } from "ol";
import { ScaleLine } from "ol/control";
import OSMXML from "ol/format/OSMXML";
import { Tile as TileLayer, Vector as VectorLayer } from "ol/layer";
import { OSM, Vector as VectorSource } from "ol/source";
import { Circle as CircleStyle, Fill, Stroke, Style, Text } from "ol/style";
import MapCSS from "./mapcss.pegjs";
import "./style.css";

(document.getElementById("execute") as HTMLButtonElement).onclick = execute;

const lineStyle = new Style({
  stroke: new Stroke({
    color: "#dc0000",
    width: 4,
  }),
});

const textStyle = new Style({
  image: new CircleStyle({
    radius: 5,
    fill: new Fill({ color: "#dc0000" }),
    stroke: new Stroke({ color: "#dc0000", width: 1 }),
  }),
  text: new Text({
    fill: new Fill({ color: "#dc0000" }),
    stroke: new Stroke({ color: "white", width: 2 }),
    font: "14px Noto Sans",
    textAlign: "start",
    textBaseline: "bottom",
    text: "",
  }),
});

const vectorLayer = new VectorLayer({
  style: (feature) => {
    const type = feature.getGeometry()!.getType();
    const name = feature.getProperties().name;
    if (
      type === "LineString" ||
      type === "MultiLineString" ||
      type === "GeometryCollection"
    ) {
      return lineStyle;
    } else if (type === "Point" && name) {
      const text = textStyle.getText();
      const left =
        /Rohrendorf|Gedersdorf|Langenlois|Gars|Stallegg|Rosenburg|Horn/;
      text.setText(`  ${name}  `);
      text.setTextAlign(left.test(name) ? "end" : "start");
      text.setTextBaseline(/Krems/.test(name) ? "top" : "bottom");
      return textStyle;
    }
  },
});

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

async function execute() {
  try {
    const mapcss = document.getElementById("mapcss") as HTMLTextAreaElement;
    const rules = MapCSS.parse(mapcss.value);
    console.log("Parsed MapCSS", rules);
  } catch (e) {
    console.error("Failed to parse MapCSS", e);
  }
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
}
