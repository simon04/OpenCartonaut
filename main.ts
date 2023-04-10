import type { FeatureCollection } from "geojson";
import { Map, View } from "ol";
import { ScaleLine } from "ol/control";
import { GeoJSON } from "ol/format";
import { Tile as TileLayer, Vector as VectorLayer } from "ol/layer";
import { fromLonLat } from "ol/proj";
import { OSM, Vector as VectorSource } from "ol/source";
import { Circle as CircleStyle, Fill, Stroke, Style, Text } from "ol/style";
import "./style.css";

const geojson = await queryOverpass(`
[out:json];
relation(4740507);
(._;>;);
convert Feature ::=::,::geom=geom(),_osm_type=type();
out geom;
`);

const vectorSource = new VectorSource({
  features: new GeoJSON().readFeatures(geojson, {
    dataProjection: "EPSG:4326",
    featureProjection: "EPSG:3857",
  }),
});

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
  source: vectorSource,
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
      text.setText(`  ${name}  `);
      text.setTextAlign(
        /Rohrendorf|Gedersdorf|Langenlois|Gars|Stallegg|Rosenburg|Horn/.test(
          name
        )
          ? "end"
          : "start"
      );
      text.setTextBaseline(/Krems/.test(name) ? "top" : "bottom");
      return textStyle;
    }
  },
});

new Map({
  target: "map",
  layers: [
    new TileLayer({
      opacity: 0.8,
      source: new OSM(),
    }),
    vectorLayer,
  ],
  view: new View({
    center: fromLonLat([15.6268, 48.4098]),
    zoom: 11,
  }),
  controls: [new ScaleLine()],
});

async function queryOverpass(ql: string): Promise<FeatureCollection> {
  const res = await fetch("https://overpass-api.de/api/interpreter", {
    method: "POST",
    body: "data=" + encodeURIComponent(ql),
  });
  const json = await res.json();
  return {
    type: "FeatureCollection",
    features: json.elements.map((feature) => ({
      ...feature,
      tags: undefined,
      properties: feature.tags,
    })),
  };
}
