# OpenCartonaut

Query and render OpenStreetMap data using the Overpass API, OpenLayers and MapCSS

## Usage

https://simon04.github.io/OpenCartonaut/

1. Query Overpass API using [Overpass QL](https://wiki.openstreetmap.org/wiki/Overpass_API/Overpass_QL)
2. Style map using [MapCSS](https://wiki.openstreetmap.org/wiki/MapCSS)

## Contributing

```sh
yarn
yarn dev
open http://localhost:5173/
```

## Dependencies

- [OpenLayers](https://openlayers.org/)
- [Overpass API](https://overpass-api.de/)
- [Vite](https://vitejs.dev/) (build dependency)
- [Peggy](https://peggyjs.org/) (build dependency to compile MapCSS parser)

## Author and License

- Author: simon04
- License: [GPL v3](https://www.gnu.org/licenses/gpl.html)
