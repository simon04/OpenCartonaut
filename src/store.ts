import defaultMapCSS from "./default.mapcss?raw";

const defaultInterpreter = "https://overpass-api.de/api/interpreter";

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

export const STORE = new (class Store {
  get interpreter(): string {
    const key = "overpass-ol.interpreter";
    const value = localStorage.getItem(key) || defaultInterpreter;
    localStorage.setItem(key, value);
    return value;
  }
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
