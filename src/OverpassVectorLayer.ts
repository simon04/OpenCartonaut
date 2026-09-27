import { Vector as VectorLayer } from "ol/layer";
import { Vector as VectorSource } from "ol/source";
import { type Rule, evaluateStyle, parseMapCSS } from "./mapcss";
import { Geometry } from "ol/geom";
import type Feature from "ol/Feature";
import GeoJSON from "ol/format/GeoJSON";
import OSMXML from "./OSMXML";
import { splitQuerySubpart } from "./overpass";
import { STORE } from "./store";
import { homepage } from "../package.json";

export default class OverpassVectorLayer extends VectorLayer<VectorSource<Feature<Geometry>>> {
  async executeQuery(query: string) {
    const map = this.getMapInternal();
    const features = [];
    for (const { query: q, subpart } of splitQuerySubpart(query)) {
      features.push(
        ...(/\/\/\/\s*@type geojson/dg.test(q)
          ? this.readGeoJSON(q.replace(/\/\/\/.*/dg, ""), subpart)
          : await this.executeQuery0(q, subpart)),
      );
    }
    const vectorSource = new VectorSource({ features });
    this.setSource(vectorSource);
    map?.getView().fit(vectorSource.getExtent(), { padding: [24, 24, 24, 24] });
  }

  private readGeoJSON(query: string, subpart = "") {
    const features = new GeoJSON().readFeatures(query);
    features.forEach((feature) => feature.set("@subpart", subpart));
    return features;
  }

  private async executeQuery0(query: string, subpart = "") {
    const map = this.getMapInternal();
    if (map) {
      const [minx, miny, maxx, maxy] = map.getView().calculateExtent();
      query = query.replaceAll("{{bbox}}", [miny, minx, maxy, maxx].join(","));
    }
    const xml = await queryOverpass(query);
    const features = new OSMXML().readFeatures(xml);
    features.forEach((feature) => feature.set("@subpart", subpart));
    return features;
  }

  executeStyle(mapcss: string): Rule[] {
    const rules = parseMapCSS(mapcss);
    console.info("Parsed MapCSS", rules);
    const vectorSource = this.getSource();
    vectorSource?.forEachFeature((feature) => feature.setStyle(evaluateStyle(rules, feature)));
    return rules;
  }
}

export async function queryOverpass(ql: string): Promise<string> {
  const key = `overpass-ol.cache.${ql}`;
  const cached = sessionStorage.getItem(key);
  if (cached !== null) return cached;
  const text = await fetchOverpass(ql);
  try {
    sessionStorage.setItem(key, text);
  } catch (e) {
    console.warn("Failed to cache Overpass result", e);
  }
  return text;
}

async function fetchOverpass(ql: string): Promise<string> {
  const res = await fetch(STORE.interpreter, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded; charset=UTF-8",
      "X-User-Agent": homepage,
    },
    body: "data=" + encodeURIComponent(ql),
  });
  if (!res.ok) {
    const lines = (await res.text()).split("\n");
    throw new Error(lines.find((line) => line.includes("Error")));
  }
  return await res.text();
}
