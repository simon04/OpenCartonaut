import { Vector as VectorLayer } from "ol/layer";
import { Vector as VectorSource } from "ol/source";
import { evaluateStyle, parseMapCSS } from "./mapcss";
import { Geometry } from "ol/geom";
import OSMXML from "./OSMXML";

export default class OverpassVectorLayer extends VectorLayer<
  VectorSource<Geometry>
> {
  async executeQuery(query: string) {
    const map = this.getMapInternal();
    if (map) {
      const [minx, miny, maxx, maxy] = map.getView().calculateExtent();
      query = query.replaceAll("{{bbox}}", [miny, minx, maxy, maxx].join(","));
    }
    const xml = await queryOverpass(query);
    const vectorSource = new VectorSource({
      features: new OSMXML().readFeatures(xml),
    });
    this.setSource(vectorSource);
    map?.getView().fit(vectorSource.getExtent(), { padding: [24, 24, 24, 24] });
  }

  executeStyle(mapcss: string) {
    const rules = parseMapCSS(mapcss);
    console.info("Parsed MapCSS", rules);
    const vectorSource = this.getSource();
    vectorSource?.forEachFeature((feature) =>
      feature.setStyle(evaluateStyle(rules, feature))
    );
  }
}

export async function queryOverpass(ql: string): Promise<string> {
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
