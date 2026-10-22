# Maps

Renders the static maps of the website (`src/img/*Map*.avif`) from OpenStreetMap data. Everything is defined in a config file, so a set of maps can be reviewed, committed and rendered again.

The map data comes from [OpenFreeMap](https://openfreemap.org/) vector tiles, extra places and routes from [Overpass](https://wiki.openstreetmap.org/wiki/Overpass_API). Nothing needs an account or key.

## Use

Needs Node.js 22.18 or newer, which runs the TypeScript files as they are.

```sh
cd contrib/maps
pnpm install
node map.ts maps.json                    # all maps of the file
node map.ts maps.json HackathonMap       # only this one
node map.ts maps.json --out /tmp/maps    # somewhere else than the config says
```

`maps.json` renders the maps of the hackathon page. The images are drawn with the credit for the data in the corner, as the licence (ODbL) asks. Add a `.license` file next to a new image, like the other ones in `src/img`.

## Config

Paths are relative to the config file.

```json
{
    "out": "../../src/img",
    "format": "avif",
    "theme": { "water": "#a7d6f0" },
    "pin": { "size": 36, "image": "assets/pin.svg" },
    "pois": [
        { "query": "node[railway=station]({{bbox}});out;", "image": "station.svg", "size": 18 }
    ],
    "overpassUrl": "https://overpass-api.de/api/interpreter",
    "maps": {
        "Venue": {
            "sizes": ["1100x1100", "1600x760"],
            "zoom": 16.4,
            "places": [{ "at": [55.65, 12.54], "label": "Venue", "image": "venue.svg", "size": 60 }]
        },
        "Trip": {
            "note": "about 40 min by train",
            "places": [
                { "at": [55.65, 12.54], "label": "Hackathon" },
                { "at": [55.6, 13.0], "label": "Conference" }
            ],
            "route": { "overpass": "relation(3345661);out geom;" }
        }
    }
}
```

| Key           | Where           | Meaning                                                                                                             |
| ------------- | --------------- | ------------------------------------------------------------------------------------------------------------------- |
| `out`         | top             | Directory for the images, default is the one of the config                                                          |
| `format`      | top             | `avif` (default), `png`, `webp` or `jpg`                                                                            |
| `theme`       | top, map        | `preset` (`default` or `quiet`) and colours to change, the names are in `src/theme.ts`                              |
| `pin`         | top, map, place | `image` (SVG or bitmap, default is the round `[m]` pin) and `size` (height in pixels, default 36)                   |
| `pois`        | top, map        | Overpass queries whose nodes are drawn as dots or with an `image`. A map's list replaces the default                |
| `overpassUrl` | top, map        | Another Overpass server                                                                                             |
| `scale`       | map             | Factor for pins, labels, lines and dots, default 1. Use more for a map that is shown small                          |
| `sizes`       | map             | List of `"WIDTHxHEIGHT"`, default `["1100x1100"]`. With several sizes the size is added to the name                 |
| `zoom`        | map             | Zoom as on openstreetmap.org. Default: fit all places and the route, 16 for a single place                          |
| `places`      | map             | `at` as `[latitude, longitude]`, optional `label`, `image` and `size`. `"image": null` turns it off                 |
| `route`       | map             | Points `[[lat, lon], ...]` or `{ "overpass": "..." }`                                                               |
| `scaleBar`    | top, map        | `true` draws a scale bar in the bottom left corner, default `false`                                                 |
| `areaLabels`  | top, map        | `[{ "at": [lat, lon], "text": "Øresund" }]` quiet names of areas, such as a sea. `false` turns off those of the top |
| `note`        | map             | Text in the middle of the route                                                                                     |

The image of a pin has its tip, the bottom centre, on the place. Images of `pois` are centred on the node.

### Routes

A route is a list of points or an Overpass query. The query selects one route relation and ends in `out geom;`. Its ways are joined into one line and cut to the part between the first and the last place, and the line is drawn smooth.

To find the relation, open [Overpass Turbo](https://overpass-turbo.eu/) and look for route relations near the places, for example `relation["route"="train"]({{bbox}});out tags;`. The id is the number in the result. `relation(3345661);out geom;` is the Øresundståg between Copenhagen, Malmö and Gothenburg. `{{bbox}}` in a route query is the area around the places. The area of a route that is not a straight line is larger than that, so a relation is better selected by its id. Queries for `pois` use the area of the map.

The `quiet` theme mutes the base map, so that the route and the pins are the only strong colours. It fits overview maps. The default theme matches the other maps of the site.

## Overpass

The public servers have [rules](https://wiki.openstreetmap.org/wiki/Overpass_API#Public_Overpass_API_instances). The tool follows them: it names itself in the User-Agent, sends one request at a time, waits 30 seconds (then 60, 120) after an error and caches the answers in `.cache/`. Delete that directory to ask again. A server that is down for a while makes a run slow, not fail. `overpassUrl` can point to another [instance](https://wiki.openstreetmap.org/wiki/Overpass_API#Public_Overpass_API_instances).

## Accessibility

The images are not enough on their own, give each one an `alt` text on the page that says what the map shows, for example "Map of the railway from the conference in Malmö to the hackathon in Copenhagen, about 40 minutes by train". The design follows [WCAG 2.2](https://www.w3.org/TR/WCAG22/):

- Lines and pins need a contrast of 3:1 to what is next to them (1.4.11). The purple of the route alone is only 1.6 to 2.4:1 on the colours of the map. With the black outline it is 11:1 or more on every colour except the dark roads, and there the purple itself is 3.9:1. The pin is white with a black outline.
- Text is white on black (21:1, 1.4.3). The credit is dark grey on a white panel.
- Parks and green areas have a pattern of dots on top of the green. Orange and green are easy to confuse with red-green colour blindness, and the pattern means they differ in more than colour. In a simulated deuteranopia the buildings also stay clearly darker than the parks.
- Nothing depends on colour alone (1.4.1): places have labels, the route has a note.
- Labels shrink with the image. On a phone a 1600 pixel wide map is shown at a quarter of its size. Render a second map for small screens with a narrower `sizes` entry and a larger `scale`, and show it with `srcset` or `<picture>`.

## Fonts

Labels are drawn with the `sans` font of the system, so they look a little different on each system.

## Development

```sh
pnpm test      # node --test
pnpm check     # tsc
pnpm lint      # eslint
pnpm format    # prettier
```

The code is TypeScript that Node runs as it is, so there is no build step. TypeScript is on version 6 because typescript-eslint does not support 7 yet.
