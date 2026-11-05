var __defProp = Object.defineProperty;
var __defNormalProp = (obj, key, value) => key in obj ? __defProp(obj, key, { enumerable: true, configurable: true, writable: true, value }) : obj[key] = value;
var __publicField = (obj, key, value) => __defNormalProp(obj, typeof key !== "symbol" ? key + "" : key, value);
const DEFAULT_BASEMAP_PROVIDERS = [
  { id: "amap", name: "Amap", category: "Regional" },
  { id: "amazon", name: "Amazon Location", category: "General" },
  { id: "carto", name: "Carto", category: "General" },
  { id: "cyclosm", name: "CyclOSM", category: "Cycling" },
  { id: "eox", name: "EOX", category: "Imagery" },
  { id: "esri", name: "ESRI", category: "Imagery" },
  { id: "google", name: "Google", category: "General" },
  { id: "here", name: "HERE", category: "Traffic" },
  { id: "mapbox", name: "Mapbox", category: "General" },
  { id: "maptiler", name: "MapTiler", category: "General" },
  { id: "maptoolkit", name: "Maptoolkit", category: "Outdoor" },
  { id: "nasa-gibs", name: "NASA GIBS", category: "Imagery" },
  { id: "openbasiskaart", name: "Openbasiskaart", category: "Regional" },
  { id: "openfreemap", name: "OpenFreeMap", category: "Vector Styles" },
  { id: "openrailwaymap", name: "OpenRailwayMap", category: "Transport" },
  { id: "openstreetmap", name: "OpenStreetMap", category: "Community" },
  { id: "opentopomap", name: "OpenTopoMap", category: "Terrain" },
  { id: "protomaps", name: "Protomaps", category: "Vector Styles" },
  { id: "stadia", name: "Stadia Maps", category: "General" },
  { id: "swisstopo", name: "Swiss Federal Geoportal", category: "Regional" },
  { id: "tencent", name: "Tencent Maps", category: "Regional" },
  { id: "tianditu", name: "Tianditu", category: "Regional" },
  { id: "tomtom", name: "TomTom", category: "Traffic" },
  { id: "topplusopen", name: "TopPlusOpen", category: "Regional" },
  { id: "usgs", name: "USGS", category: "United States" },
  { id: "waymarkedtrails", name: "Waymarked Trails", category: "Outdoor" }
];
function rasterBasemap({
  id,
  name,
  provider,
  category,
  description,
  attribution,
  tiles,
  maxzoom = 19,
  scheme,
  tags = []
}) {
  return {
    id,
    name,
    provider,
    type: "raster",
    category,
    description,
    attribution,
    source: {
      type: "raster",
      tiles,
      tileSize: 256,
      maxzoom,
      scheme
    },
    tags
  };
}
function styleBasemap({
  id,
  name,
  provider,
  category,
  description,
  attribution,
  url,
  view,
  tags = []
}) {
  return {
    id,
    name,
    provider,
    type: "style",
    category,
    description,
    attribution,
    source: {
      type: "style",
      url
    },
    view,
    tags
  };
}
function mapTilerStyleBasemap({
  id,
  name,
  mapId,
  category,
  description,
  url,
  tags = []
}) {
  return styleBasemap({
    id,
    name,
    provider: "maptiler",
    category,
    description,
    attribution: MAPTILER_ATTRIBUTION,
    url: url ?? `https://api.maptiler.com/maps/${mapId}/style.json?key={api-key}`,
    tags: ["maptiler", "vector", "style", ...tags]
  });
}
function amazonStyleBasemap({
  id,
  name,
  mapStyle,
  category,
  description,
  tags = []
}) {
  return styleBasemap({
    id,
    name,
    provider: "amazon",
    category,
    description,
    attribution: AMAZON_ATTRIBUTION,
    url: `https://maps.geo.{aws-region}.amazonaws.com/v2/styles/${mapStyle}/descriptor?key={api-key}`,
    tags: ["amazon", "aws", "location", "style", ...tags]
  });
}
function mapboxStyleBasemap({
  id,
  name,
  styleId,
  category,
  description,
  tags = []
}) {
  return styleBasemap({
    id,
    name,
    provider: "mapbox",
    category,
    description,
    attribution: MAPBOX_ATTRIBUTION,
    url: `https://api.mapbox.com/styles/v1/mapbox/${styleId}?access_token={api-key}`,
    tags: ["mapbox", "vector", "style", ...tags]
  });
}
function mapToolkitStyleBasemap({
  id,
  name,
  styleId,
  category,
  description,
  tags = []
}) {
  return styleBasemap({
    id,
    name,
    provider: "maptoolkit",
    category,
    description,
    attribution: MAPTOOLKIT_ATTRIBUTION,
    url: `https://styles.maptoolkit.org/${styleId}.json`,
    tags: ["maptoolkit", "vector", "style", ...tags]
  });
}
function protomapsStyleBasemap({
  id,
  name,
  styleId,
  category,
  description,
  tags = []
}) {
  return styleBasemap({
    id,
    name,
    provider: "protomaps",
    category,
    description,
    attribution: PROTOMAPS_ATTRIBUTION,
    url: `https://api.protomaps.com/styles/v5/${styleId}/en.json?key={api-key}`,
    tags: ["protomaps", "vector", "style", ...tags]
  });
}
function stadiaRasterBasemap({
  id,
  name,
  slug,
  category,
  description,
  extension = "png",
  maxzoom = 20,
  stamen = false,
  tags = []
}) {
  return rasterBasemap({
    id,
    name,
    provider: "stadia",
    category,
    description,
    attribution: stamen ? STADIA_STAMEN_ATTRIBUTION : STADIA_ATTRIBUTION,
    tiles: [
      `https://tiles.stadiamaps.com/tiles/${slug}/{z}/{x}/{y}.${extension}?api_key={api-key}`
    ],
    maxzoom,
    tags: ["stadia", ...stamen ? ["stamen"] : [], ...tags]
  });
}
const TIANDITU_HOSTS = [0, 1, 2, 3, 4, 5, 6, 7];
function tiandituRasterBasemap({
  id,
  name,
  layer,
  category,
  description,
  maxzoom = 18,
  tags = []
}) {
  return rasterBasemap({
    id,
    name,
    provider: "tianditu",
    category,
    description,
    attribution: TIANDITU_ATTRIBUTION,
    tiles: TIANDITU_HOSTS.map(
      (host) => `https://t${host}.tianditu.gov.cn/DataServer?T=${layer}&x={x}&y={y}&l={z}&tk={api-key}`
    ),
    maxzoom,
    tags: ["tianditu", "china", "天地图", ...tags]
  });
}
function amapTiles(host, query) {
  return [1, 2, 3, 4].map(
    (index) => `https://${host}0${index}.is.autonavi.com/appmaptile?${query}&x={x}&y={y}&z={z}`
  );
}
function sortProviders(providers) {
  return [...providers].sort((a, b) => a.name.localeCompare(b.name));
}
const AMAZON_ATTRIBUTION = "&copy; Amazon Location Service";
const CARTO_ATTRIBUTION = "&copy; OpenStreetMap contributors &copy; CARTO";
const ESRI_ATTRIBUTION = "Tiles &copy; Esri and the GIS User Community";
const MAPBOX_ATTRIBUTION = "&copy; Mapbox &copy; OpenStreetMap contributors";
const MAPTILER_ATTRIBUTION = "&copy; MapTiler &copy; OpenStreetMap contributors";
const OSM_ATTRIBUTION = "&copy; OpenStreetMap contributors";
const MAPTOOLKIT_ATTRIBUTION = '<a href="https://www.maptoolkit.org" target="_blank" rel="noopener">&copy; Maptoolkit</a> <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener">&copy; OSM</a>';
const STADIA_ATTRIBUTION = '&copy; <a href="https://stadiamaps.com/" target="_blank" rel="noopener">Stadia Maps</a> &copy; <a href="https://openmaptiles.org/" target="_blank" rel="noopener">OpenMapTiles</a> &copy; OpenStreetMap contributors';
const STADIA_STAMEN_ATTRIBUTION = '&copy; <a href="https://stadiamaps.com/" target="_blank" rel="noopener">Stadia Maps</a> &copy; <a href="https://stamen.com/" target="_blank" rel="noopener">Stamen Design</a> &copy; <a href="https://openmaptiles.org/" target="_blank" rel="noopener">OpenMapTiles</a> &copy; OpenStreetMap contributors';
const PROTOMAPS_ATTRIBUTION = '<a href="https://protomaps.com" target="_blank" rel="noopener">Protomaps</a> &copy; <a href="https://openstreetmap.org" target="_blank" rel="noopener">OpenStreetMap</a>';
const OPENFREEMAP_ATTRIBUTION = "OpenFreeMap &copy; OpenMapTiles Data from OpenStreetMap";
const TIANDITU_ATTRIBUTION = '&copy; <a href="https://www.tianditu.gov.cn" target="_blank" rel="noopener">天地图 Tianditu</a> (National Platform for Common Geospatial Information Services)';
const AMAP_ATTRIBUTION = '&copy; <a href="https://www.amap.com" target="_blank" rel="noopener">高德地图 Amap</a>';
const TENCENT_ATTRIBUTION = '&copy; <a href="https://map.qq.com" target="_blank" rel="noopener">腾讯地图 Tencent Maps</a>';
const GCJ02_WARNING = "Tiles are in the GCJ-02 datum, so WGS84 data overlaid on them appears offset by roughly 100-700 m.";
const TOMTOM_ATTRIBUTION = "&copy; TomTom";
const HERE_ATTRIBUTION = "&copy; HERE";
const GOOGLE_ATTRIBUTION = "&copy; Google";
const GOOGLE_2DTILES_URL = "https://tile.googleapis.com/v1/2dtiles/{z}/{x}/{y}?session={session}&key={api-key}";
function googleRasterBasemap({
  id,
  name,
  category,
  description,
  publicLyrs,
  session,
  tags
}) {
  return {
    id,
    name,
    provider: "google",
    type: "raster",
    category,
    description,
    attribution: GOOGLE_ATTRIBUTION,
    source: {
      type: "raster",
      tiles: [`https://mt1.google.com/vt/lyrs=${publicLyrs}&x={x}&y={y}&z={z}`],
      sessionTiles: [GOOGLE_2DTILES_URL],
      tileSize: 256,
      maxzoom: 20,
      googleSession: session
    },
    tags
  };
}
const eoxS2CloudlessAttribution = (year) => `Sentinel-2 cloudless <a href="https://cloudless.eox.at" target="_blank" rel="noopener">EOxCloudless</a> by EOX IT Services GmbH (Contains modified Copernicus Sentinel data ${year})`;
const EOX_S2CLOUDLESS_YEARS = [
  2018,
  2019,
  2020,
  2021,
  2022,
  2023,
  2024,
  2025
];
function eoxS2CloudlessBasemap(year) {
  return rasterBasemap({
    id: `eox-s2cloudless-${year}`,
    name: `EOX Sentinel-2 cloudless ${year}`,
    provider: "eox",
    category: "Imagery",
    description: `Cloudless Sentinel-2 satellite mosaic for ${year} (non-commercial use).`,
    attribution: eoxS2CloudlessAttribution(year),
    tiles: [
      `https://tiles.maps.eox.at/wmts/1.0.0/s2cloudless-${year}_3857/default/GoogleMapsCompatible/{z}/{y}/{x}.jpg`
    ],
    maxzoom: 16,
    tags: [
      "eox",
      "sentinel",
      "satellite",
      "imagery",
      "cloudless",
      "copernicus",
      String(year)
    ]
  });
}
const EOX_TERRAIN_LIGHT_ATTRIBUTION = 'Terrain Light <a href="https://maps.eox.at" target="_blank" rel="noopener">EOX</a> (Data &copy; OpenStreetMap contributors and others, Rendering &copy; EOX)';
const EOX_TERRAIN_ATTRIBUTION = 'Terrain <a href="https://maps.eox.at" target="_blank" rel="noopener">EOX</a> (Data &copy; OpenStreetMap contributors and others, Rendering &copy; EOX)';
const EOX_OVERLAY_ATTRIBUTION = 'Overlay <a href="https://maps.eox.at" target="_blank" rel="noopener">EOX</a> (Data &copy; OpenStreetMap contributors and others, Rendering &copy; EOX)';
const MAPBOX_TRAFFIC_CONGESTION_COLORS = [
  "match",
  ["get", "congestion"],
  "low",
  "#4caf50",
  "moderate",
  "#ffc107",
  "heavy",
  "#ff5722",
  "severe",
  "#b71c1c",
  "#9e9e9e"
];
function rasterTrafficBasemap({
  id,
  name,
  provider,
  description,
  attribution,
  tiles,
  maxzoom = 22,
  tags = []
}) {
  return rasterBasemap({
    id,
    name,
    provider,
    category: "Traffic",
    description,
    attribution,
    tiles,
    maxzoom,
    tags: ["traffic", "overlay", ...tags]
  });
}
const DEFAULT_BASEMAPS = [
  rasterBasemap({
    id: "osm-standard",
    name: "OpenStreetMap Standard",
    provider: "openstreetmap",
    category: "Street",
    description: "Community-maintained street map.",
    attribution: OSM_ATTRIBUTION,
    tiles: [
      "https://a.tile.openstreetmap.org/{z}/{x}/{y}.png",
      "https://b.tile.openstreetmap.org/{z}/{x}/{y}.png",
      "https://c.tile.openstreetmap.org/{z}/{x}/{y}.png"
    ],
    tags: ["osm", "street", "standard"]
  }),
  rasterBasemap({
    id: "osm-hot",
    name: "OpenStreetMap HOT",
    provider: "openstreetmap",
    category: "Street",
    description: "Humanitarian OpenStreetMap Team style.",
    attribution: `${OSM_ATTRIBUTION}, Tiles style by Humanitarian OpenStreetMap Team`,
    tiles: ["https://a.tile.openstreetmap.fr/hot/{z}/{x}/{y}.png"],
    tags: ["osm", "hot", "humanitarian"]
  }),
  rasterBasemap({
    id: "osm-de",
    name: "OpenStreetMap DE",
    provider: "openstreetmap",
    category: "Regional",
    description: "German OpenStreetMap tile style.",
    attribution: OSM_ATTRIBUTION,
    tiles: ["https://tile.openstreetmap.de/{z}/{x}/{y}.png"],
    tags: ["osm", "germany", "regional"]
  }),
  rasterBasemap({
    id: "osm-ch",
    name: "OpenStreetMap CH",
    provider: "openstreetmap",
    category: "Regional",
    description: "Swiss OpenStreetMap tile style.",
    attribution: OSM_ATTRIBUTION,
    tiles: ["https://tile.osm.ch/switzerland/{z}/{x}/{y}.png"],
    tags: ["osm", "switzerland", "regional"]
  }),
  googleRasterBasemap({
    id: "google-maps",
    name: "Google Maps",
    category: "Street",
    description: "Google road map tiles. Uses the Map Tiles API when a Google Maps API key is set, otherwise keyless xyz tiles.",
    publicLyrs: "m",
    session: { mapType: "roadmap" },
    tags: ["google", "street"]
  }),
  googleRasterBasemap({
    id: "google-satellite",
    name: "Google Satellite",
    category: "Imagery",
    description: "Google satellite tiles. Uses the Map Tiles API when a Google Maps API key is set, otherwise keyless xyz tiles.",
    publicLyrs: "s",
    session: { mapType: "satellite" },
    tags: ["google", "satellite", "imagery"]
  }),
  googleRasterBasemap({
    id: "google-terrain",
    name: "Google Terrain",
    category: "Terrain",
    description: "Google terrain tiles. Uses the Map Tiles API when a Google Maps API key is set, otherwise keyless xyz tiles.",
    publicLyrs: "p",
    // The Map Tiles API requires `layerRoadmap` alongside the terrain map type
    // for the terrain tiles to render.
    session: { mapType: "terrain", layerTypes: ["layerRoadmap"] },
    tags: ["google", "terrain"]
  }),
  googleRasterBasemap({
    id: "google-hybrid",
    name: "Google Hybrid",
    category: "Imagery",
    description: "Google hybrid imagery tiles. Uses the Map Tiles API when a Google Maps API key is set, otherwise keyless xyz tiles.",
    publicLyrs: "y",
    // Hybrid is satellite imagery with the roadmap layer (roads and labels)
    // painted on top, matching the classic Google "hybrid" map type.
    session: { mapType: "satellite", layerTypes: ["layerRoadmap"] },
    tags: ["google", "hybrid", "imagery"]
  }),
  amazonStyleBasemap({
    id: "amazon-standard",
    name: "Amazon Standard",
    mapStyle: "Standard",
    category: "Street",
    description: "Amazon Location general-purpose vector map style.",
    tags: ["standard", "street"]
  }),
  amazonStyleBasemap({
    id: "amazon-monochrome",
    name: "Amazon Monochrome",
    mapStyle: "Monochrome",
    category: "Light",
    description: "Amazon Location grey scale map style for overlays.",
    tags: ["monochrome", "light", "dataviz"]
  }),
  amazonStyleBasemap({
    id: "amazon-hybrid",
    name: "Amazon Hybrid",
    mapStyle: "Hybrid",
    category: "Imagery",
    description: "Amazon Location satellite imagery with road and label overlay.",
    tags: ["hybrid", "satellite", "imagery", "labels"]
  }),
  amazonStyleBasemap({
    id: "amazon-satellite",
    name: "Amazon Satellite",
    mapStyle: "Satellite",
    category: "Imagery",
    description: "Amazon Location satellite imagery map style.",
    tags: ["satellite", "imagery"]
  }),
  mapboxStyleBasemap({
    id: "mapbox-streets",
    name: "Mapbox Streets",
    styleId: "streets-v12",
    category: "Street",
    description: "Mapbox general-purpose street map style.",
    tags: ["streets", "street"]
  }),
  mapboxStyleBasemap({
    id: "mapbox-outdoors",
    name: "Mapbox Outdoors",
    styleId: "outdoors-v12",
    category: "Outdoor",
    description: "Mapbox outdoor recreation and terrain style.",
    tags: ["outdoors", "terrain", "recreation"]
  }),
  mapboxStyleBasemap({
    id: "mapbox-light",
    name: "Mapbox Light",
    styleId: "light-v11",
    category: "Light",
    description: "Light Mapbox style for data overlays.",
    tags: ["light", "dataviz"]
  }),
  mapboxStyleBasemap({
    id: "mapbox-dark",
    name: "Mapbox Dark",
    styleId: "dark-v11",
    category: "Dark",
    description: "Dark Mapbox style for high-contrast overlays.",
    tags: ["dark"]
  }),
  mapboxStyleBasemap({
    id: "mapbox-satellite",
    name: "Mapbox Satellite",
    styleId: "satellite-v9",
    category: "Imagery",
    description: "Mapbox satellite imagery style.",
    tags: ["satellite", "imagery"]
  }),
  mapboxStyleBasemap({
    id: "mapbox-satellite-streets",
    name: "Mapbox Satellite Streets",
    styleId: "satellite-streets-v12",
    category: "Imagery",
    description: "Mapbox satellite imagery with streets and labels.",
    tags: ["satellite", "streets", "imagery", "labels"]
  }),
  mapboxStyleBasemap({
    id: "mapbox-navigation-day",
    name: "Mapbox Navigation Day",
    styleId: "navigation-day-v1",
    category: "Navigation",
    description: "Mapbox daytime navigation style.",
    tags: ["navigation", "day"]
  }),
  mapboxStyleBasemap({
    id: "mapbox-navigation-night",
    name: "Mapbox Navigation Night",
    styleId: "navigation-night-v1",
    category: "Navigation",
    description: "Mapbox nighttime navigation style.",
    tags: ["navigation", "night", "dark"]
  }),
  mapTilerStyleBasemap({
    id: "maptiler-aquarelle",
    name: "MapTiler Aquarelle",
    mapId: "aquarelle-v4",
    category: "Artistic",
    description: "Watercolor-style vector basemap.",
    tags: ["aquarelle", "watercolor", "artistic"]
  }),
  mapTilerStyleBasemap({
    id: "maptiler-backdrop",
    name: "MapTiler Backdrop",
    mapId: "backdrop-v4",
    category: "Light",
    description: "Subtle monochrome context map.",
    tags: ["backdrop", "monochrome", "context"]
  }),
  mapTilerStyleBasemap({
    id: "maptiler-base",
    name: "MapTiler Base",
    mapId: "base-v4",
    category: "Street",
    description: "General-purpose vector basemap.",
    tags: ["base", "street"]
  }),
  mapTilerStyleBasemap({
    id: "maptiler-dataviz",
    name: "MapTiler Dataviz",
    mapId: "dataviz-v4",
    category: "Light",
    description: "Minimal basemap for data visualization and overlays.",
    tags: ["dataviz", "data", "light"]
  }),
  mapTilerStyleBasemap({
    id: "maptiler-landscape",
    name: "MapTiler Landscape",
    mapId: "landscape-v4",
    category: "Terrain",
    description: "Light terrain and hillshade map.",
    tags: ["landscape", "terrain", "hillshade"]
  }),
  mapTilerStyleBasemap({
    id: "maptiler-ocean",
    name: "MapTiler Ocean",
    mapId: "ocean-v4",
    category: "Marine",
    description: "Ocean bathymetry and marine-focused basemap.",
    tags: ["ocean", "marine", "bathymetry"]
  }),
  mapTilerStyleBasemap({
    id: "maptiler-openstreetmap",
    name: "MapTiler OpenStreetMap",
    mapId: "openstreetmap",
    category: "Street",
    description: "OpenStreetMap style hosted by MapTiler.",
    url: "https://api.maptiler.com/maps/openstreetmap/style.json?key",
    tags: ["openstreetmap", "osm", "street"]
  }),
  mapTilerStyleBasemap({
    id: "maptiler-outdoor",
    name: "MapTiler Outdoor",
    mapId: "outdoor-v4",
    category: "Outdoor",
    description: "Outdoor recreation basemap with terrain detail.",
    tags: ["outdoor", "terrain", "recreation"]
  }),
  mapTilerStyleBasemap({
    id: "maptiler-satellite-hybrid",
    name: "MapTiler Satellite Hybrid",
    mapId: "hybrid-v4",
    category: "Imagery",
    description: "Satellite imagery with labels, roads, and borders.",
    tags: ["satellite", "hybrid", "imagery", "labels"]
  }),
  mapTilerStyleBasemap({
    id: "maptiler-satellite-plain",
    name: "MapTiler Satellite Plain",
    mapId: "satellite-v4",
    category: "Imagery",
    description: "Satellite imagery without the hybrid reference overlay.",
    tags: ["satellite", "imagery"]
  }),
  mapTilerStyleBasemap({
    id: "maptiler-streets",
    name: "MapTiler Streets",
    mapId: "streets-v4",
    category: "Street",
    description: "Detailed street map for general navigation.",
    tags: ["streets", "street", "navigation"]
  }),
  mapTilerStyleBasemap({
    id: "maptiler-toner",
    name: "MapTiler Toner",
    mapId: "toner-v2",
    category: "Dark",
    description: "High-contrast monochrome basemap.",
    url: "https://api.maptiler.com/maps/toner-v2/style.json?key=",
    tags: ["toner", "monochrome", "contrast"]
  }),
  mapTilerStyleBasemap({
    id: "maptiler-topo",
    name: "MapTiler Topo",
    mapId: "topo-v4",
    category: "Terrain",
    description: "Topographic basemap with contours and terrain context.",
    tags: ["topo", "topographic", "terrain"]
  }),
  mapTilerStyleBasemap({
    id: "maptiler-winter",
    name: "MapTiler Winter",
    mapId: "winter-v4",
    category: "Outdoor",
    description: "Winter sports and mountain activity basemap.",
    tags: ["winter", "skiing", "outdoor"]
  }),
  rasterBasemap({
    id: "carto-positron",
    name: "Carto Positron",
    provider: "carto",
    category: "Light",
    description: "Light basemap for data overlays.",
    attribution: CARTO_ATTRIBUTION,
    tiles: [
      "https://a.basemaps.cartocdn.com/light_all/{z}/{x}/{y}.png?key={api-key}",
      "https://b.basemaps.cartocdn.com/light_all/{z}/{x}/{y}.png?key={api-key}",
      "https://c.basemaps.cartocdn.com/light_all/{z}/{x}/{y}.png?key={api-key}",
      "https://d.basemaps.cartocdn.com/light_all/{z}/{x}/{y}.png?key={api-key}"
    ],
    maxzoom: 20,
    tags: ["carto", "light", "positron"]
  }),
  rasterBasemap({
    id: "carto-positron-no-labels",
    name: "Carto Positron No Labels",
    provider: "carto",
    category: "Light",
    description: "Light basemap without labels.",
    attribution: CARTO_ATTRIBUTION,
    tiles: ["https://a.basemaps.cartocdn.com/light_nolabels/{z}/{x}/{y}.png?key={api-key}"],
    maxzoom: 20,
    tags: ["carto", "light", "no labels"]
  }),
  rasterBasemap({
    id: "carto-positron-only-labels",
    name: "Carto Positron Only Labels",
    provider: "carto",
    category: "Labels",
    description: "Carto Positron labels layer.",
    attribution: CARTO_ATTRIBUTION,
    tiles: [
      "https://a.basemaps.cartocdn.com/light_only_labels/{z}/{x}/{y}.png?key={api-key}"
    ],
    maxzoom: 20,
    tags: ["carto", "labels"]
  }),
  rasterBasemap({
    id: "carto-dark-matter",
    name: "Carto Dark Matter",
    provider: "carto",
    category: "Dark",
    description: "Dark basemap for high-contrast overlays.",
    attribution: CARTO_ATTRIBUTION,
    tiles: [
      "https://a.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}.png?key={api-key}",
      "https://b.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}.png?key={api-key}",
      "https://c.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}.png?key={api-key}",
      "https://d.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}.png?key={api-key}"
    ],
    maxzoom: 20,
    tags: ["carto", "dark", "matter"]
  }),
  rasterBasemap({
    id: "carto-dark-matter-no-labels",
    name: "Carto Dark Matter No Labels",
    provider: "carto",
    category: "Dark",
    description: "Dark basemap without labels.",
    attribution: CARTO_ATTRIBUTION,
    tiles: ["https://a.basemaps.cartocdn.com/dark_nolabels/{z}/{x}/{y}.png?key={api-key}"],
    maxzoom: 20,
    tags: ["carto", "dark", "no labels"]
  }),
  rasterBasemap({
    id: "carto-dark-matter-only-labels",
    name: "Carto Dark Matter Only Labels",
    provider: "carto",
    category: "Labels",
    description: "Carto Dark Matter labels layer.",
    attribution: CARTO_ATTRIBUTION,
    tiles: ["https://a.basemaps.cartocdn.com/dark_only_labels/{z}/{x}/{y}.png?key={api-key}"],
    maxzoom: 20,
    tags: ["carto", "dark", "labels"]
  }),
  rasterBasemap({
    id: "carto-voyager",
    name: "Carto Voyager",
    provider: "carto",
    category: "Street",
    description: "Detailed street basemap with subtle styling.",
    attribution: CARTO_ATTRIBUTION,
    tiles: [
      "https://a.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}.png?key={api-key}",
      "https://b.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}.png?key={api-key}",
      "https://c.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}.png?key={api-key}",
      "https://d.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}.png?key={api-key}"
    ],
    maxzoom: 20,
    tags: ["carto", "street", "voyager"]
  }),
  rasterBasemap({
    id: "carto-voyager-no-labels",
    name: "Carto Voyager No Labels",
    provider: "carto",
    category: "Street",
    description: "Carto Voyager without labels.",
    attribution: CARTO_ATTRIBUTION,
    tiles: [
      "https://a.basemaps.cartocdn.com/rastertiles/voyager_nolabels/{z}/{x}/{y}.png?key={api-key}"
    ],
    maxzoom: 20,
    tags: ["carto", "voyager", "no labels"]
  }),
  rasterBasemap({
    id: "carto-voyager-only-labels",
    name: "Carto Voyager Only Labels",
    provider: "carto",
    category: "Labels",
    description: "Carto Voyager labels layer.",
    attribution: CARTO_ATTRIBUTION,
    tiles: [
      "https://a.basemaps.cartocdn.com/rastertiles/voyager_only_labels/{z}/{x}/{y}.png?key={api-key}"
    ],
    maxzoom: 20,
    tags: ["carto", "voyager", "labels"]
  }),
  rasterBasemap({
    id: "carto-voyager-labels-under",
    name: "Carto Voyager Labels Under",
    provider: "carto",
    category: "Street",
    description: "Carto Voyager labels-under variant.",
    attribution: CARTO_ATTRIBUTION,
    tiles: [
      "https://a.basemaps.cartocdn.com/rastertiles/voyager_labels_under/{z}/{x}/{y}.png?key={api-key}"
    ],
    maxzoom: 20,
    tags: ["carto", "voyager", "labels"]
  }),
  rasterBasemap({
    id: "cyclosm",
    name: "CyclOSM",
    provider: "cyclosm",
    category: "Cycling",
    description: "Cycling-focused OpenStreetMap style.",
    attribution: "CyclOSM | Map data: &copy; OpenStreetMap contributors",
    tiles: ["https://a.tile-cyclosm.openstreetmap.fr/cyclosm/{z}/{x}/{y}.png"],
    tags: ["cycling", "osm"]
  }),
  rasterBasemap({
    id: "esri-world-imagery",
    name: "World Imagery",
    provider: "esri",
    category: "Imagery",
    description: "Satellite and aerial imagery.",
    attribution: "Tiles &copy; Esri, Maxar, Earthstar Geographics, and the GIS User Community",
    tiles: [
      "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"
    ],
    tags: ["esri", "satellite", "imagery"]
  }),
  rasterBasemap({
    id: "esri-world-topo",
    name: "World Topographic",
    provider: "esri",
    category: "Terrain",
    description: "Reference topographic map.",
    attribution: ESRI_ATTRIBUTION,
    tiles: [
      "https://server.arcgisonline.com/ArcGIS/rest/services/World_Topo_Map/MapServer/tile/{z}/{y}/{x}"
    ],
    tags: ["esri", "topographic", "terrain"]
  }),
  rasterBasemap({
    id: "esri-world-street-map",
    name: "World Street Map",
    provider: "esri",
    category: "Street",
    description: "ESRI street reference basemap.",
    attribution: ESRI_ATTRIBUTION,
    tiles: [
      "https://server.arcgisonline.com/ArcGIS/rest/services/World_Street_Map/MapServer/tile/{z}/{y}/{x}"
    ],
    tags: ["esri", "street"]
  }),
  rasterBasemap({
    id: "esri-world-gray-canvas",
    name: "World Gray Canvas",
    provider: "esri",
    category: "Light",
    description: "Light gray canvas basemap.",
    attribution: ESRI_ATTRIBUTION,
    tiles: [
      "https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Light_Gray_Base/MapServer/tile/{z}/{y}/{x}"
    ],
    tags: ["esri", "gray", "canvas"]
  }),
  rasterBasemap({
    id: "esri-world-dark-gray-canvas",
    name: "World Dark Gray Canvas",
    provider: "esri",
    category: "Dark",
    description: "Dark gray canvas basemap for high-contrast overlays.",
    attribution: ESRI_ATTRIBUTION,
    tiles: [
      "https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Dark_Gray_Base/MapServer/tile/{z}/{y}/{x}"
    ],
    tags: ["esri", "dark", "gray", "canvas"]
  }),
  rasterBasemap({
    id: "esri-world-light-gray-reference",
    name: "World Light Gray Reference",
    provider: "esri",
    category: "Labels",
    description: "Boundary and place label overlay matching the Light Gray Canvas basemap.",
    attribution: ESRI_ATTRIBUTION,
    tiles: [
      "https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Light_Gray_Reference/MapServer/tile/{z}/{y}/{x}"
    ],
    tags: ["esri", "labels", "reference", "gray", "overlay"]
  }),
  rasterBasemap({
    id: "esri-world-dark-gray-reference",
    name: "World Dark Gray Reference",
    provider: "esri",
    category: "Labels",
    description: "Boundary and place label overlay matching the Dark Gray Canvas basemap.",
    attribution: ESRI_ATTRIBUTION,
    tiles: [
      "https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Dark_Gray_Reference/MapServer/tile/{z}/{y}/{x}"
    ],
    tags: ["esri", "labels", "reference", "dark", "gray", "overlay"]
  }),
  rasterBasemap({
    id: "esri-natgeo-world-map",
    name: "NatGeo World Map",
    provider: "esri",
    category: "Street",
    description: "National Geographic style world map.",
    attribution: ESRI_ATTRIBUTION,
    tiles: [
      "https://server.arcgisonline.com/ArcGIS/rest/services/NatGeo_World_Map/MapServer/tile/{z}/{y}/{x}"
    ],
    tags: ["esri", "natgeo"]
  }),
  rasterBasemap({
    id: "esri-ocean-basemap",
    name: "Ocean Basemap",
    provider: "esri",
    category: "Marine",
    description: "Ocean reference basemap.",
    attribution: ESRI_ATTRIBUTION,
    tiles: [
      "https://server.arcgisonline.com/ArcGIS/rest/services/Ocean/World_Ocean_Base/MapServer/tile/{z}/{y}/{x}"
    ],
    tags: ["esri", "ocean", "marine"]
  }),
  rasterBasemap({
    id: "esri-world-physical",
    name: "World Physical",
    provider: "esri",
    category: "Terrain",
    description: "Physical world map.",
    attribution: ESRI_ATTRIBUTION,
    tiles: [
      "https://server.arcgisonline.com/ArcGIS/rest/services/World_Physical_Map/MapServer/tile/{z}/{y}/{x}"
    ],
    tags: ["esri", "physical", "terrain"]
  }),
  rasterBasemap({
    id: "esri-world-shaded-relief",
    name: "World Shaded Relief",
    provider: "esri",
    category: "Terrain",
    description: "Shaded relief world map.",
    attribution: ESRI_ATTRIBUTION,
    tiles: [
      "https://server.arcgisonline.com/ArcGIS/rest/services/World_Shaded_Relief/MapServer/tile/{z}/{y}/{x}"
    ],
    tags: ["esri", "relief", "terrain"]
  }),
  rasterBasemap({
    id: "esri-world-terrain",
    name: "World Terrain",
    provider: "esri",
    category: "Terrain",
    description: "ESRI terrain base.",
    attribution: ESRI_ATTRIBUTION,
    tiles: [
      "https://server.arcgisonline.com/ArcGIS/rest/services/World_Terrain_Base/MapServer/tile/{z}/{y}/{x}"
    ],
    tags: ["esri", "terrain"]
  }),
  ...EOX_S2CLOUDLESS_YEARS.map(eoxS2CloudlessBasemap),
  rasterBasemap({
    id: "eox-terrain-light",
    name: "EOX Terrain Light",
    provider: "eox",
    category: "Terrain",
    description: "Light terrain basemap from EOX Maps (non-commercial use).",
    attribution: EOX_TERRAIN_LIGHT_ATTRIBUTION,
    tiles: [
      "https://tiles.maps.eox.at/wmts/1.0.0/terrain-light_3857/default/GoogleMapsCompatible/{z}/{y}/{x}.jpg"
    ],
    maxzoom: 14,
    tags: ["eox", "terrain", "light", "hillshade"]
  }),
  rasterBasemap({
    id: "eox-terrain",
    name: "EOX Terrain",
    provider: "eox",
    category: "Terrain",
    description: "Natural-like terrain basemap from EOX Maps (non-commercial use).",
    attribution: EOX_TERRAIN_ATTRIBUTION,
    // terrain_3857 is only published on EOX's "g" tile matrix set, which is the
    // Web Mercator (GoogleMapsCompatible) grid under a different identifier.
    tiles: [
      "https://tiles.maps.eox.at/wmts/1.0.0/terrain_3857/default/g/{z}/{y}/{x}.jpg"
    ],
    maxzoom: 14,
    tags: ["eox", "terrain", "hillshade"]
  }),
  rasterBasemap({
    id: "eox-overlay",
    name: "EOX Overlay",
    provider: "eox",
    category: "Labels",
    description: "Transparent overlay with borders and points of interest from EOX Maps (non-commercial use).",
    attribution: EOX_OVERLAY_ATTRIBUTION,
    tiles: [
      "https://tiles.maps.eox.at/wmts/1.0.0/overlay_3857/default/GoogleMapsCompatible/{z}/{y}/{x}.png"
    ],
    maxzoom: 14,
    tags: ["eox", "overlay", "labels", "borders", "reference"]
  }),
  rasterBasemap({
    id: "eox-overlay-bright",
    name: "EOX Overlay Bright",
    provider: "eox",
    category: "Labels",
    description: "Bright transparent overlay with borders and points of interest from EOX Maps (non-commercial use).",
    attribution: EOX_OVERLAY_ATTRIBUTION,
    tiles: [
      "https://tiles.maps.eox.at/wmts/1.0.0/overlay_bright_3857/default/GoogleMapsCompatible/{z}/{y}/{x}.png"
    ],
    maxzoom: 14,
    tags: ["eox", "overlay", "labels", "borders", "reference", "bright"]
  }),
  rasterBasemap({
    id: "nasa-gibs-blue-marble",
    name: "Blue Marble",
    provider: "nasa-gibs",
    category: "Imagery",
    description: "NASA Blue Marble Next Generation imagery.",
    attribution: "Imagery provided by NASA Global Imagery Browse Services",
    tiles: [
      "https://gibs.earthdata.nasa.gov/wmts/epsg3857/best/BlueMarble_NextGeneration/default/GoogleMapsCompatible_Level8/{z}/{y}/{x}.jpeg"
    ],
    maxzoom: 8,
    tags: ["nasa", "gibs", "blue marble"]
  }),
  rasterBasemap({
    id: "nasa-gibs-aster-gdem-shaded-relief",
    name: "ASTER GDEM Shaded Relief",
    provider: "nasa-gibs",
    category: "Terrain",
    description: "NASA ASTER GDEM greyscale shaded relief.",
    attribution: "Imagery provided by NASA Global Imagery Browse Services",
    tiles: [
      "https://gibs.earthdata.nasa.gov/wmts/epsg3857/best/ASTER_GDEM_Greyscale_Shaded_Relief/default/GoogleMapsCompatible_Level12/{z}/{y}/{x}.jpg"
    ],
    maxzoom: 12,
    tags: ["nasa", "gibs", "relief", "terrain"]
  }),
  rasterBasemap({
    id: "nasa-gibs-modis-terra-true-color",
    name: "MODIS Terra True Color",
    provider: "nasa-gibs",
    category: "Imagery",
    description: "NASA MODIS Terra corrected reflectance true color.",
    attribution: "Imagery provided by NASA Global Imagery Browse Services",
    tiles: [
      "https://map1.vis.earthdata.nasa.gov/wmts-webmerc/MODIS_Terra_CorrectedReflectance_TrueColor/default//GoogleMapsCompatible_Level9/{z}/{y}/{x}.jpg"
    ],
    maxzoom: 9,
    tags: ["nasa", "gibs", "modis", "true color"]
  }),
  rasterBasemap({
    id: "nasa-gibs-viirs-earth-at-night",
    name: "VIIRS Earth At Night 2012",
    provider: "nasa-gibs",
    category: "Imagery",
    description: "NASA VIIRS city lights imagery.",
    attribution: "Imagery provided by NASA Global Imagery Browse Services",
    tiles: [
      "https://map1.vis.earthdata.nasa.gov/wmts-webmerc/VIIRS_CityLights_2012/default//GoogleMapsCompatible_Level8/{z}/{y}/{x}.jpg"
    ],
    maxzoom: 8,
    tags: ["nasa", "gibs", "night", "viirs"]
  }),
  rasterBasemap({
    id: "openrailwaymap",
    name: "OpenRailwayMap",
    provider: "openrailwaymap",
    category: "Transport",
    description: "Railway infrastructure map.",
    attribution: "Map data: &copy; OpenStreetMap contributors | Map style: OpenRailwayMap",
    tiles: ["https://a.tiles.openrailwaymap.org/standard/{z}/{x}/{y}.png"],
    tags: ["rail", "transport", "osm"]
  }),
  rasterBasemap({
    id: "openrailwaymap-maxspeed",
    name: "OpenRailwayMap Maxspeed",
    provider: "openrailwaymap",
    category: "Transport",
    description: "Railway line speed limits as a transparent overlay.",
    attribution: "Map data: &copy; OpenStreetMap contributors | Map style: OpenRailwayMap",
    tiles: ["https://a.tiles.openrailwaymap.org/maxspeed/{z}/{x}/{y}.png"],
    tags: ["rail", "transport", "osm", "maxspeed", "speed", "overlay"]
  }),
  rasterBasemap({
    id: "openrailwaymap-electrification",
    name: "OpenRailwayMap Electrification",
    provider: "openrailwaymap",
    category: "Transport",
    description: "Railway electrification systems and voltages as a transparent overlay.",
    attribution: "Map data: &copy; OpenStreetMap contributors | Map style: OpenRailwayMap",
    tiles: [
      "https://a.tiles.openrailwaymap.org/electrification/{z}/{x}/{y}.png"
    ],
    tags: ["rail", "transport", "osm", "electrification", "voltage", "overlay"]
  }),
  rasterBasemap({
    id: "openrailwaymap-signals",
    name: "OpenRailwayMap Signals",
    provider: "openrailwaymap",
    category: "Transport",
    description: "Railway signalling infrastructure as a transparent overlay.",
    attribution: "Map data: &copy; OpenStreetMap contributors | Map style: OpenRailwayMap",
    tiles: ["https://a.tiles.openrailwaymap.org/signals/{z}/{x}/{y}.png"],
    tags: ["rail", "transport", "osm", "signals", "signalling", "overlay"]
  }),
  rasterBasemap({
    id: "opentopomap",
    name: "OpenTopoMap",
    provider: "opentopomap",
    category: "Terrain",
    description: "Topographic map with relief and contour styling.",
    attribution: "Map data &copy; OpenStreetMap contributors, SRTM | Map style &copy; OpenTopoMap",
    tiles: ["https://a.tile.opentopomap.org/{z}/{x}/{y}.png"],
    maxzoom: 17,
    tags: ["terrain", "topo", "relief"]
  }),
  stadiaRasterBasemap({
    id: "stadia-alidade-smooth",
    name: "Stadia Alidade Smooth",
    slug: "alidade_smooth",
    category: "Light",
    description: "Muted light basemap with few POIs, designed for overlays.",
    tags: ["alidade", "smooth", "light", "dataviz"]
  }),
  stadiaRasterBasemap({
    id: "stadia-alidade-smooth-dark",
    name: "Stadia Alidade Smooth Dark",
    slug: "alidade_smooth_dark",
    category: "Dark",
    description: "Dark counterpart to Alidade Smooth for overlays.",
    tags: ["alidade", "smooth", "dark", "dataviz"]
  }),
  stadiaRasterBasemap({
    id: "stadia-alidade-satellite",
    name: "Stadia Alidade Satellite",
    slug: "alidade_satellite",
    category: "Imagery",
    description: "Satellite imagery with Alidade labels and roads.",
    extension: "jpg",
    tags: ["alidade", "satellite", "imagery", "labels"]
  }),
  stadiaRasterBasemap({
    id: "stadia-outdoors",
    name: "Stadia Outdoors",
    slug: "outdoors",
    category: "Outdoor",
    description: "Outdoor basemap highlighting trails, parks, and ski slopes.",
    tags: ["outdoors", "trails", "hiking", "recreation"]
  }),
  stadiaRasterBasemap({
    id: "stadia-osm-bright",
    name: "Stadia OSM Bright",
    slug: "osm_bright",
    category: "Street",
    description: "General-purpose OpenStreetMap street basemap.",
    tags: ["osm", "bright", "street"]
  }),
  stadiaRasterBasemap({
    id: "stadia-stamen-toner",
    name: "Stamen Toner",
    slug: "stamen_toner",
    category: "Dark",
    description: "High-contrast black and white Stamen basemap.",
    stamen: true,
    tags: ["toner", "dark", "contrast", "monochrome"]
  }),
  stadiaRasterBasemap({
    id: "stadia-stamen-toner-lite",
    name: "Stamen Toner Lite",
    slug: "stamen_toner_lite",
    category: "Light",
    description: "Lighter, lower-contrast variant of Stamen Toner.",
    stamen: true,
    tags: ["toner", "lite", "light", "monochrome"]
  }),
  stadiaRasterBasemap({
    id: "stadia-stamen-toner-background",
    name: "Stamen Toner Background",
    slug: "stamen_toner_background",
    category: "Dark",
    description: "Stamen Toner without labels, for use under your own data.",
    stamen: true,
    tags: ["toner", "background", "no labels", "monochrome"]
  }),
  stadiaRasterBasemap({
    id: "stadia-stamen-toner-labels",
    name: "Stamen Toner Labels",
    slug: "stamen_toner_labels",
    category: "Labels",
    description: "Stamen Toner label overlay.",
    stamen: true,
    tags: ["toner", "labels", "overlay"]
  }),
  stadiaRasterBasemap({
    id: "stadia-stamen-terrain",
    name: "Stamen Terrain",
    slug: "stamen_terrain",
    category: "Terrain",
    description: "Stamen terrain basemap with hill shading and vegetation.",
    stamen: true,
    tags: ["terrain", "hillshade", "relief"]
  }),
  stadiaRasterBasemap({
    id: "stadia-stamen-terrain-background",
    name: "Stamen Terrain Background",
    slug: "stamen_terrain_background",
    category: "Terrain",
    description: "Stamen Terrain without labels or roads.",
    stamen: true,
    tags: ["terrain", "background", "hillshade", "no labels"]
  }),
  stadiaRasterBasemap({
    id: "stadia-stamen-terrain-labels",
    name: "Stamen Terrain Labels",
    slug: "stamen_terrain_labels",
    category: "Labels",
    description: "Stamen Terrain label overlay.",
    stamen: true,
    tags: ["terrain", "labels", "overlay"]
  }),
  stadiaRasterBasemap({
    id: "stadia-stamen-watercolor",
    name: "Stamen Watercolor",
    slug: "stamen_watercolor",
    category: "Artistic",
    description: "Hand-painted watercolor basemap from Stamen Design.",
    extension: "jpg",
    maxzoom: 16,
    stamen: true,
    tags: ["watercolor", "artistic", "painted"]
  }),
  rasterBasemap({
    id: "swisstopo-national-map-color",
    name: "Swiss National Map Color",
    provider: "swisstopo",
    category: "Regional",
    description: "Swiss federal color national map.",
    attribution: "&copy; swisstopo",
    tiles: [
      "https://wmts.geo.admin.ch/1.0.0/ch.swisstopo.pixelkarte-farbe/default/current/3857/{z}/{x}/{y}.jpeg"
    ],
    maxzoom: 18,
    tags: ["switzerland", "regional"]
  }),
  rasterBasemap({
    id: "swisstopo-national-map-grey",
    name: "Swiss National Map Grey",
    provider: "swisstopo",
    category: "Regional",
    description: "Swiss federal grey national map.",
    attribution: "&copy; swisstopo",
    tiles: [
      "https://wmts.geo.admin.ch/1.0.0/ch.swisstopo.pixelkarte-grau/default/current/3857/{z}/{x}/{y}.jpeg"
    ],
    maxzoom: 18,
    tags: ["switzerland", "regional", "grey"]
  }),
  rasterBasemap({
    id: "swisstopo-swissimage",
    name: "SWISSIMAGE",
    provider: "swisstopo",
    category: "Imagery",
    description: "Swiss federal aerial imagery.",
    attribution: "&copy; swisstopo",
    tiles: [
      "https://wmts.geo.admin.ch/1.0.0/ch.swisstopo.swissimage/default/current/3857/{z}/{x}/{y}.jpeg"
    ],
    maxzoom: 18,
    tags: ["switzerland", "imagery"]
  }),
  tiandituRasterBasemap({
    id: "tianditu-vector",
    name: "Tianditu Vector",
    layer: "vec_w",
    category: "Regional",
    description: "China's official street map, reachable from mainland China. Published in CGCS2000, so WGS84 data overlays without a datum shift. Pair with Tianditu Vector Labels. Requires a free Tianditu API key.",
    tags: ["vector", "street", "vec"]
  }),
  tiandituRasterBasemap({
    id: "tianditu-vector-labels",
    name: "Tianditu Vector Labels",
    layer: "cva_w",
    category: "Labels",
    description: "Place name and road label overlay for Tianditu Vector. Requires a free Tianditu API key.",
    tags: ["labels", "annotation", "overlay", "cva"]
  }),
  tiandituRasterBasemap({
    id: "tianditu-imagery",
    name: "Tianditu Imagery",
    layer: "img_w",
    category: "Imagery",
    description: "China's official satellite imagery, reachable from mainland China. Pair with Tianditu Imagery Labels. Requires a free Tianditu API key.",
    tags: ["imagery", "satellite", "img"]
  }),
  tiandituRasterBasemap({
    id: "tianditu-imagery-labels",
    name: "Tianditu Imagery Labels",
    layer: "cia_w",
    category: "Labels",
    description: "Place name and road label overlay for Tianditu Imagery. Requires a free Tianditu API key.",
    tags: ["labels", "annotation", "overlay", "cia"]
  }),
  tiandituRasterBasemap({
    id: "tianditu-terrain",
    name: "Tianditu Terrain",
    layer: "ter_w",
    category: "Terrain",
    description: "China's official shaded relief terrain map. Pair with Tianditu Terrain Labels. Requires a free Tianditu API key.",
    // The terrain pair is only published to zoom 14, unlike the vector and
    // imagery layers, which reach 18.
    maxzoom: 14,
    tags: ["terrain", "relief", "hillshade", "ter"]
  }),
  tiandituRasterBasemap({
    id: "tianditu-terrain-labels",
    name: "Tianditu Terrain Labels",
    layer: "cta_w",
    category: "Labels",
    description: "Place name label overlay for Tianditu Terrain. Requires a free Tianditu API key.",
    maxzoom: 14,
    tags: ["labels", "annotation", "overlay", "cta"]
  }),
  rasterBasemap({
    id: "amap-street",
    name: "Amap Street",
    provider: "amap",
    category: "Regional",
    description: `Amap street map of China, reachable from mainland China. ${GCJ02_WARNING}`,
    attribution: AMAP_ATTRIBUTION,
    tiles: amapTiles("wprd", "lang=zh_cn&size=1&scl=1&style=7"),
    tags: ["amap", "gaode", "高德", "china", "street", "gcj02"]
  }),
  rasterBasemap({
    id: "amap-satellite",
    name: "Amap Satellite",
    provider: "amap",
    category: "Imagery",
    description: `Amap satellite imagery, reachable from mainland China. Pair with Amap Labels. ${GCJ02_WARNING}`,
    attribution: AMAP_ATTRIBUTION,
    tiles: amapTiles("webst", "style=6"),
    // Past zoom 18 Amap returns a "no imagery" placeholder tile rather than a
    // 404, so cap here and let MapLibre overzoom instead.
    maxzoom: 18,
    tags: ["amap", "gaode", "高德", "china", "satellite", "imagery", "gcj02"]
  }),
  rasterBasemap({
    id: "amap-labels",
    name: "Amap Labels",
    provider: "amap",
    category: "Labels",
    description: `Transparent Amap road and label overlay, for use over Amap Satellite. ${GCJ02_WARNING}`,
    attribution: AMAP_ATTRIBUTION,
    tiles: amapTiles("webst", "style=8"),
    tags: [
      "amap",
      "gaode",
      "高德",
      "china",
      "labels",
      "roads",
      "overlay",
      "gcj02"
    ]
  }),
  rasterBasemap({
    id: "tencent-street",
    name: "Tencent Street",
    provider: "tencent",
    category: "Regional",
    description: `Tencent street map of China, reachable from mainland China. ${GCJ02_WARNING}`,
    attribution: TENCENT_ATTRIBUTION,
    // Tencent numbers tile rows from the bottom, so the source is TMS rather
    // than xyz; MapLibre flips `{y}` when `scheme` says so.
    tiles: [0, 1, 2, 3].map(
      (host) => `https://rt${host}.map.gtimg.com/tile?z={z}&x={x}&y={y}&styleid=1&scene=0`
    ),
    maxzoom: 18,
    scheme: "tms",
    tags: ["tencent", "qq", "腾讯", "china", "street", "gcj02"]
  }),
  rasterBasemap({
    id: "tencent-dark",
    name: "Tencent Dark",
    provider: "tencent",
    category: "Dark",
    description: `Dark Tencent street map for high-contrast overlays, reachable from mainland China. ${GCJ02_WARNING}`,
    attribution: TENCENT_ATTRIBUTION,
    tiles: [0, 1, 2, 3].map(
      (host) => `https://rt${host}.map.gtimg.com/tile?z={z}&x={x}&y={y}&styleid=4&scene=0`
    ),
    maxzoom: 18,
    scheme: "tms",
    tags: ["tencent", "qq", "腾讯", "china", "dark", "gcj02"]
  }),
  rasterBasemap({
    id: "topplusopen-color",
    name: "TopPlusOpen Color",
    provider: "topplusopen",
    category: "Regional",
    description: "German TopPlusOpen color basemap.",
    attribution: "Map data: &copy; dl-de/by-2-0",
    tiles: [
      "https://sgx.geodatenzentrum.de/wmts_topplus_open/tile/1.0.0/web/default/WEBMERCATOR/{z}/{y}/{x}.png"
    ],
    maxzoom: 18,
    tags: ["germany", "regional"]
  }),
  rasterBasemap({
    id: "topplusopen-grey",
    name: "TopPlusOpen Grey",
    provider: "topplusopen",
    category: "Regional",
    description: "German TopPlusOpen grey basemap.",
    attribution: "Map data: &copy; dl-de/by-2-0",
    tiles: [
      "https://sgx.geodatenzentrum.de/wmts_topplus_open/tile/1.0.0/web_grau/default/WEBMERCATOR/{z}/{y}/{x}.png"
    ],
    maxzoom: 18,
    tags: ["germany", "regional", "grey"]
  }),
  rasterBasemap({
    id: "usgs-us-imagery",
    name: "USGS US Imagery",
    provider: "usgs",
    category: "Imagery",
    description: "USGS imagery-only basemap.",
    attribution: "Tiles courtesy of the U.S. Geological Survey",
    tiles: [
      "https://basemap.nationalmap.gov/arcgis/rest/services/USGSImageryOnly/MapServer/tile/{z}/{y}/{x}"
    ],
    tags: ["usgs", "imagery", "united states"]
  }),
  rasterBasemap({
    id: "usgs-us-imagery-topo",
    name: "USGS US Imagery Topo",
    provider: "usgs",
    category: "Imagery",
    description: "USGS imagery with topographic reference.",
    attribution: "Tiles courtesy of the U.S. Geological Survey",
    tiles: [
      "https://basemap.nationalmap.gov/arcgis/rest/services/USGSImageryTopo/MapServer/tile/{z}/{y}/{x}"
    ],
    tags: ["usgs", "imagery", "topo", "united states"]
  }),
  rasterBasemap({
    id: "usgs-us-topo",
    name: "USGS US Topo",
    provider: "usgs",
    category: "Terrain",
    description: "USGS topographic basemap.",
    attribution: "Tiles courtesy of the U.S. Geological Survey",
    tiles: [
      "https://basemap.nationalmap.gov/arcgis/rest/services/USGSTopo/MapServer/tile/{z}/{y}/{x}"
    ],
    tags: ["usgs", "topo", "united states"]
  }),
  rasterBasemap({
    id: "usgs-us-hydro",
    name: "USGS US Hydrography",
    provider: "usgs",
    category: "Labels",
    description: "USGS National Hydrography reference overlay of rivers, streams, and waterbodies.",
    attribution: "Tiles courtesy of the U.S. Geological Survey",
    tiles: [
      "https://basemap.nationalmap.gov/arcgis/rest/services/USGSHydroCached/MapServer/tile/{z}/{y}/{x}"
    ],
    tags: ["usgs", "hydrography", "water", "overlay", "united states"]
  }),
  rasterBasemap({
    id: "usgs-us-shaded-relief",
    name: "USGS US Shaded Relief",
    provider: "usgs",
    category: "Terrain",
    description: "USGS shaded relief basemap without other reference content.",
    attribution: "Tiles courtesy of the U.S. Geological Survey",
    tiles: [
      "https://basemap.nationalmap.gov/arcgis/rest/services/USGSShadedReliefOnly/MapServer/tile/{z}/{y}/{x}"
    ],
    tags: ["usgs", "relief", "hillshade", "terrain", "united states"]
  }),
  rasterBasemap({
    id: "waymarkedtrails-hiking",
    name: "Waymarked Trails Hiking",
    provider: "waymarkedtrails",
    category: "Outdoor",
    description: "Hiking routes from Waymarked Trails.",
    attribution: "Map data: &copy; OpenStreetMap contributors | Map style: Waymarked Trails",
    tiles: ["https://tile.waymarkedtrails.org/hiking/{z}/{x}/{y}.png"],
    tags: ["hiking", "outdoor", "trails"]
  }),
  rasterBasemap({
    id: "waymarkedtrails-cycling",
    name: "Waymarked Trails Cycling",
    provider: "waymarkedtrails",
    category: "Cycling",
    description: "Cycling routes from Waymarked Trails.",
    attribution: "Map data: &copy; OpenStreetMap contributors | Map style: Waymarked Trails",
    tiles: ["https://tile.waymarkedtrails.org/cycling/{z}/{x}/{y}.png"],
    tags: ["cycling", "outdoor", "trails"]
  }),
  rasterBasemap({
    id: "waymarkedtrails-mtb",
    name: "Waymarked Trails MTB",
    provider: "waymarkedtrails",
    category: "Cycling",
    description: "Mountain biking routes from Waymarked Trails.",
    attribution: "Map data: &copy; OpenStreetMap contributors | Map style: Waymarked Trails",
    tiles: ["https://tile.waymarkedtrails.org/mtb/{z}/{x}/{y}.png"],
    tags: ["mtb", "outdoor", "trails"]
  }),
  rasterBasemap({
    id: "waymarkedtrails-slopes",
    name: "Waymarked Trails Slopes",
    provider: "waymarkedtrails",
    category: "Outdoor",
    description: "Slope routes from Waymarked Trails.",
    attribution: "Map data: &copy; OpenStreetMap contributors | Map style: Waymarked Trails",
    tiles: ["https://tile.waymarkedtrails.org/slopes/{z}/{x}/{y}.png"],
    tags: ["slopes", "outdoor", "trails"]
  }),
  rasterBasemap({
    id: "openbasiskaart",
    name: "Openbasiskaart",
    provider: "openbasiskaart",
    category: "Regional",
    description: "Netherlands topographic background map based on OpenStreetMap data.",
    attribution: "Map data &copy; OpenStreetMap contributors | Openbasiskaart",
    // The Google Maps Compatible (osm-g) layer uses the standard Web Mercator
    // grid, so its WMTS {TileMatrix}/{TileRow}/{TileCol} maps directly to xyz.
    tiles: [
      "https://www.openbasiskaart.nl/mapcache/wmts/1.0.0/osm-g/default/g/{z}/{y}/{x}.png"
    ],
    maxzoom: 18,
    tags: ["netherlands", "regional", "topographic", "osm", "openbasiskaart"]
  }),
  {
    id: "openfreemap-positron",
    name: "OpenFreeMap Positron",
    provider: "openfreemap",
    type: "style",
    category: "Light",
    description: "Light, minimal OpenFreeMap vector style for data overlays.",
    attribution: OPENFREEMAP_ATTRIBUTION,
    source: {
      type: "style",
      url: "https://tiles.openfreemap.org/styles/positron"
    },
    tags: ["openfreemap", "vector", "style", "positron", "light"]
  },
  {
    id: "openfreemap-bright",
    name: "OpenFreeMap Bright",
    provider: "openfreemap",
    type: "style",
    category: "Street",
    description: "Colorful OpenFreeMap vector street style.",
    attribution: OPENFREEMAP_ATTRIBUTION,
    source: {
      type: "style",
      url: "https://tiles.openfreemap.org/styles/bright"
    },
    tags: ["openfreemap", "vector", "style", "bright", "street"]
  },
  {
    id: "openfreemap-liberty",
    name: "OpenFreeMap Liberty",
    provider: "openfreemap",
    type: "style",
    category: "Vector",
    description: "Open vector style loaded as a full MapLibre style.",
    attribution: OPENFREEMAP_ATTRIBUTION,
    source: {
      type: "style",
      url: "https://tiles.openfreemap.org/styles/liberty"
    },
    tags: ["openfreemap", "vector", "style"]
  },
  {
    id: "openfreemap-dark",
    name: "OpenFreeMap Dark",
    provider: "openfreemap",
    type: "style",
    category: "Dark",
    description: "Dark OpenFreeMap vector style.",
    attribution: OPENFREEMAP_ATTRIBUTION,
    source: {
      type: "style",
      url: "https://tiles.openfreemap.org/styles/dark"
    },
    tags: ["openfreemap", "vector", "style", "dark"]
  },
  {
    id: "openfreemap-fiord",
    name: "OpenFreeMap Fiord",
    provider: "openfreemap",
    type: "style",
    category: "Dark",
    description: "Blue-toned dark OpenFreeMap vector style.",
    attribution: OPENFREEMAP_ATTRIBUTION,
    source: {
      type: "style",
      url: "https://tiles.openfreemap.org/styles/fiord"
    },
    tags: ["openfreemap", "vector", "style", "fiord", "dark"]
  },
  {
    id: "openfreemap-3d",
    name: "OpenFreeMap 3D",
    provider: "openfreemap",
    type: "style",
    category: "3D",
    description: "OpenFreeMap Liberty style with a pitched 3D camera view.",
    attribution: OPENFREEMAP_ATTRIBUTION,
    source: {
      type: "style",
      url: "https://tiles.openfreemap.org/styles/liberty"
    },
    view: {
      center: [-0.114, 51.506],
      zoom: 14.2,
      bearing: 55.2,
      pitch: 60
    },
    tags: ["openfreemap", "vector", "style", "3d", "liberty"]
  },
  protomapsStyleBasemap({
    id: "protomaps-light",
    name: "Protomaps Light",
    styleId: "light",
    category: "Light",
    description: "Light Protomaps vector basemap.",
    tags: ["light"]
  }),
  protomapsStyleBasemap({
    id: "protomaps-dark",
    name: "Protomaps Dark",
    styleId: "dark",
    category: "Dark",
    description: "Dark Protomaps vector basemap.",
    tags: ["dark"]
  }),
  protomapsStyleBasemap({
    id: "protomaps-white",
    name: "Protomaps White",
    styleId: "white",
    category: "Light",
    description: "Minimal white Protomaps basemap for data overlays.",
    tags: ["white", "minimal", "dataviz"]
  }),
  protomapsStyleBasemap({
    id: "protomaps-black",
    name: "Protomaps Black",
    styleId: "black",
    category: "Dark",
    description: "Minimal black Protomaps basemap for data overlays.",
    tags: ["black", "minimal", "dataviz"]
  }),
  protomapsStyleBasemap({
    id: "protomaps-grayscale",
    name: "Protomaps Grayscale",
    styleId: "grayscale",
    category: "Light",
    description: "Monochrome Protomaps basemap for data overlays.",
    tags: ["grayscale", "monochrome", "dataviz"]
  }),
  protomapsStyleBasemap({
    id: "protomaps-contrast",
    name: "Protomaps Contrast",
    styleId: "contrast",
    category: "Light",
    description: "High-contrast Protomaps basemap.",
    tags: ["contrast", "accessibility"]
  }),
  mapToolkitStyleBasemap({
    id: "maptoolkit-summer",
    name: "Maptoolkit Summer",
    styleId: "summer",
    category: "Outdoor",
    description: "Maptoolkit outdoor summer style with hillshading and terrain detail.",
    tags: ["summer", "outdoor", "terrain", "hillshade"]
  }),
  mapToolkitStyleBasemap({
    id: "maptoolkit-light",
    name: "Maptoolkit Light",
    styleId: "light",
    category: "Light",
    description: "Light Maptoolkit style for data overlays.",
    tags: ["light", "dataviz"]
  }),
  mapToolkitStyleBasemap({
    id: "maptoolkit-hiking",
    name: "Maptoolkit Hiking",
    styleId: "hiking",
    category: "Outdoor",
    description: "Maptoolkit hiking style with trails, rock drawing, and terrain.",
    tags: ["hiking", "outdoor", "trails", "terrain"]
  }),
  mapToolkitStyleBasemap({
    id: "maptoolkit-cycling",
    name: "Maptoolkit Cycling",
    styleId: "cycling",
    category: "Cycling",
    description: "Maptoolkit cycling style with bike routes and terrain.",
    tags: ["cycling", "outdoor", "routes"]
  }),
  mapToolkitStyleBasemap({
    id: "maptoolkit-winter",
    name: "Maptoolkit Winter",
    styleId: "winter",
    category: "Outdoor",
    description: "Maptoolkit winter sports style with slopes and mountain terrain.",
    tags: ["winter", "skiing", "slopes", "outdoor"]
  }),
  mapToolkitStyleBasemap({
    id: "maptoolkit-dark",
    name: "Maptoolkit Dark",
    styleId: "dark",
    category: "Dark",
    description: "Dark Maptoolkit style for high-contrast overlays.",
    tags: ["dark"]
  }),
  mapToolkitStyleBasemap({
    id: "maptoolkit-street",
    name: "Maptoolkit Street",
    styleId: "street",
    category: "Street",
    description: "Maptoolkit general-purpose street style.",
    tags: ["street", "streets", "navigation"]
  }),
  rasterTrafficBasemap({
    id: "tomtom-traffic-flow-relative",
    name: "TomTom Traffic Flow",
    provider: "tomtom",
    description: "TomTom traffic speeds relative to free-flow speed. Requires a TomTom API key.",
    attribution: TOMTOM_ATTRIBUTION,
    tiles: [
      "https://api.tomtom.com/traffic/map/4/tile/flow/relative0/{z}/{x}/{y}.png?key={api-key}"
    ],
    tags: ["tomtom", "flow", "relative"]
  }),
  rasterTrafficBasemap({
    id: "tomtom-traffic-flow-absolute",
    name: "TomTom Traffic Flow Absolute",
    provider: "tomtom",
    description: "TomTom traffic colored by absolute speed. Requires a TomTom API key.",
    attribution: TOMTOM_ATTRIBUTION,
    tiles: [
      "https://api.tomtom.com/traffic/map/4/tile/flow/absolute/{z}/{x}/{y}.png?key={api-key}"
    ],
    tags: ["tomtom", "flow", "absolute"]
  }),
  rasterTrafficBasemap({
    id: "tomtom-traffic-flow-relative-delay",
    name: "TomTom Traffic Flow Delay",
    provider: "tomtom",
    description: "TomTom traffic highlighting only roads delayed below free-flow speed. Requires a TomTom API key.",
    attribution: TOMTOM_ATTRIBUTION,
    tiles: [
      "https://api.tomtom.com/traffic/map/4/tile/flow/relative-delay/{z}/{x}/{y}.png?key={api-key}"
    ],
    tags: ["tomtom", "flow", "delay"]
  }),
  rasterTrafficBasemap({
    id: "here-traffic-flow",
    name: "HERE Traffic Flow",
    provider: "here",
    description: "HERE real-time traffic flow overlay. Requires a HERE API key.",
    attribution: HERE_ATTRIBUTION,
    tiles: [
      "https://traffic.maps.hereapi.com/v3/flow/mc/{z}/{x}/{y}/png?apiKey={api-key}"
    ],
    tags: ["here", "flow"]
  }),
  {
    id: "mapbox-traffic",
    name: "Mapbox Traffic",
    provider: "mapbox",
    type: "vector-overlay",
    category: "Traffic",
    description: "Mapbox real-time traffic congestion overlay. Requires a Mapbox access token.",
    attribution: MAPBOX_ATTRIBUTION,
    source: {
      type: "vector-overlay",
      url: "mapbox://mapbox.mapbox-traffic-v1",
      sourceLayer: "traffic",
      layerType: "line",
      layout: {
        "line-join": "round",
        "line-cap": "round"
      },
      paint: {
        "line-width": [
          "interpolate",
          ["linear"],
          ["zoom"],
          6,
          1.5,
          14,
          4,
          18,
          8
        ],
        "line-color": MAPBOX_TRAFFIC_CONGESTION_COLORS
      }
    },
    tags: ["mapbox", "traffic", "overlay", "congestion"]
  },
  {
    id: "google-traffic",
    name: "Google Traffic",
    provider: "google",
    type: "raster",
    category: "Traffic",
    description: "Google real-time traffic overlay via the Map Tiles API. Requires a Google Maps API key.",
    attribution: GOOGLE_ATTRIBUTION,
    source: {
      type: "raster",
      tiles: [
        "https://tile.googleapis.com/v1/2dtiles/{z}/{x}/{y}?session={session}&key={api-key}"
      ],
      tileSize: 256,
      maxzoom: 22,
      googleSession: {
        mapType: "roadmap",
        layerTypes: ["layerTraffic"],
        overlay: true
      }
    },
    tags: ["google", "traffic", "overlay"]
  }
];
function combineProviders(defaults, custom = []) {
  const byId = /* @__PURE__ */ new Map();
  defaults.forEach((provider) => byId.set(provider.id, provider));
  custom.forEach((provider) => byId.set(provider.id, provider));
  return sortProviders([...byId.values()]);
}
function resolveBasemapProviders(basemaps, customProviders = [], includeDefaultProviders = true) {
  const byId = /* @__PURE__ */ new Map();
  if (includeDefaultProviders) {
    DEFAULT_BASEMAP_PROVIDERS.forEach(
      (provider) => byId.set(provider.id, provider)
    );
  }
  customProviders.forEach((provider) => byId.set(provider.id, provider));
  basemaps.forEach((basemap) => {
    if (basemap.provider && !byId.has(basemap.provider)) {
      byId.set(basemap.provider, {
        id: basemap.provider,
        name: basemap.provider
      });
    }
  });
  return sortProviders([...byId.values()]);
}
function createBasemapCatalog(customBasemaps = [], includeDefaultBasemaps = true) {
  const basemaps = includeDefaultBasemaps ? [...DEFAULT_BASEMAPS, ...customBasemaps] : [...customBasemaps];
  const byId = /* @__PURE__ */ new Map();
  basemaps.forEach((basemap) => byId.set(basemap.id, basemap));
  return [...byId.values()];
}
function filterBasemaps(basemaps, filter) {
  var _a;
  const query = ((_a = filter.query) == null ? void 0 : _a.trim().toLowerCase()) ?? "";
  return basemaps.filter((basemap) => {
    if (filter.provider && basemap.provider !== filter.provider) return false;
    if (filter.category && basemap.category !== filter.category) return false;
    if (!query) return true;
    const haystack = [
      basemap.name,
      basemap.provider,
      basemap.category,
      basemap.description,
      ...basemap.tags ?? []
    ].filter(Boolean).join(" ").toLowerCase();
    return haystack.includes(query);
  });
}
function getBasemapCategories(basemaps) {
  return [
    ...new Set(
      basemaps.map((basemap) => basemap.category).filter(Boolean)
    )
  ].sort();
}
const DEFAULT_OPTIONS = {
  collapsed: true,
  position: "top-right",
  title: "Basemaps",
  panelWidth: 340,
  className: "",
  includeDefaultBasemaps: true,
  allowMultiple: false,
  showMultipleToggle: true,
  resizable: true
};
const CONTROL_SOURCE_PREFIX = "maplibre-basemap-control-source";
const CONTROL_LAYER_PREFIX = "";
const API_KEY_PLACEHOLDER = "{api-key}";
const MAPTILER_API_KEY_EXAMPLE = "YOUR_MAPTILER_API_KEY";
const MAPTILER_API_KEY_QUERY = "?key";
const MAPTILER_API_KEY_EMPTY_QUERY = "?key=";
const AWS_REGION_PLACEHOLDER = "{aws-region}";
const PROVIDER_CREDENTIAL_HELP = {
  carto: {
    url: "https://carto.com/basemaps/apikey/",
    label: "Get a CARTO API key"
  },
  amazon: {
    url: "https://docs.aws.amazon.com/location/latest/developerguide/using-apikeys.html",
    label: "Get an Amazon API key"
  },
  maptiler: {
    url: "https://cloud.maptiler.com/account/keys/",
    label: "Get a MapTiler API key"
  },
  mapbox: {
    url: "https://docs.mapbox.com/help/getting-started/access-tokens/",
    label: "Get a Mapbox access token"
  },
  protomaps: {
    url: "https://protomaps.com/account",
    label: "Get a Protomaps API key"
  },
  stadia: {
    url: "https://client.stadiamaps.com/signup/",
    label: "Get a Stadia Maps API key"
  },
  tianditu: {
    url: "https://console.tianditu.gov.cn/api/key",
    label: "Get a Tianditu API key"
  },
  tomtom: {
    url: "https://developer.tomtom.com/how-to-get-tomtom-api-key",
    label: "Get a TomTom API key"
  },
  here: {
    url: "https://www.here.com/get-started/pricing",
    label: "Get a HERE API key"
  },
  google: {
    url: "https://developers.google.com/maps/documentation/tile/get-api-key",
    label: "Get a Google Maps API key"
  }
};
const RASTER_KEY_LABELS = {
  carto: "CARTO API key",
  google: "Google Maps API key",
  here: "HERE API key",
  stadia: "Stadia Maps API key",
  tianditu: "Tianditu API key",
  tomtom: "TomTom API key"
};
const STYLE_AUTH_GRACE_MS = 2500;
const MIN_PANEL_WIDTH = 240;
const MIN_PANEL_HEIGHT = 200;
const PANEL_VIEWPORT_MARGIN = 12;
class MissingCredentialError extends Error {
  constructor(message, provider) {
    super(message);
    __publicField(this, "provider");
    this.name = "MissingCredentialError";
    this.provider = provider;
  }
}
class BasemapLoadError extends Error {
  constructor(message, provider, status) {
    super(message);
    __publicField(this, "provider");
    __publicField(this, "status");
    this.name = "BasemapLoadError";
    this.provider = provider;
    this.status = status;
  }
}
function extractErrorUrl(error) {
  if (error && typeof error === "object" && "url" in error) {
    const url = error.url;
    if (typeof url === "string") return url;
  }
  return void 0;
}
function extractErrorStatus(error) {
  if (error && typeof error === "object" && "status" in error) {
    const status = error.status;
    if (typeof status === "number" && status > 0) return status;
  }
  return void 0;
}
class BasemapControl {
  constructor(options) {
    __publicField(this, "_map");
    __publicField(this, "_mapContainer");
    __publicField(this, "_container");
    __publicField(this, "_panel");
    __publicField(this, "_content");
    __publicField(this, "_options");
    __publicField(this, "_state");
    __publicField(this, "_basemaps");
    __publicField(this, "_providers");
    __publicField(this, "_eventHandlers", new globalThis.Map());
    // Active managed raster basemaps keyed by basemap id, in insertion order. In
    // single mode this holds at most one entry; in multiple mode it tracks every
    // stacked raster overlay so each can be added or removed independently.
    __publicField(this, "_managedRasters", new globalThis.Map());
    __publicField(this, "_mapTilerApiKey", "");
    __publicField(this, "_cartoApiKey", "");
    __publicField(this, "_amazonApiKey", "");
    __publicField(this, "_awsRegion", "");
    __publicField(this, "_mapboxAccessToken", "");
    __publicField(this, "_protomapsApiKey", "");
    __publicField(this, "_stadiaApiKey", "");
    __publicField(this, "_tiandituApiKey", "");
    __publicField(this, "_tomtomApiKey", "");
    __publicField(this, "_hereApiKey", "");
    __publicField(this, "_googleMapsApiKey", "");
    // Cached Google Map Tiles API session tokens keyed by their session config, so
    // a traffic overlay reuses a token until it expires instead of creating a new
    // session on every add. Keyed by the serialized config + API key.
    __publicField(this, "_googleSessions", new globalThis.Map());
    // Which sub-view the panel content shows: the basemap list, or the dedicated
    // API-keys settings view opened from the header key button (#837).
    __publicField(this, "_activeView", "basemaps");
    __publicField(this, "_settingsButton");
    // Provider of the most recent missing-credential error, used to pick the
    // matching help link and the inline credential field beside the error. Kept
    // in sync with `_state.error` (both are cleared together) so it is never
    // stale when consulted.
    __publicField(this, "_missingCredentialProvider");
    // The basemap whose application last failed for a missing credential, so the
    // inline credential field's Enter key can re-attempt it (#837).
    __publicField(this, "_lastFailedBasemapId");
    // The id of a just-applied basemap that is showing its keyless public tiles
    // because no API key is set (currently the Google Maps/Satellite/Terrain/
    // Hybrid basemaps). The panel offers an optional inline key input that
    // upgrades it to the authorized tiles; leaving it blank keeps the fallback.
    __publicField(this, "_optionalKeyBasemapId");
    // Detaches the listeners watching the in-flight style load (see
    // _watchStyleLoad). Set while a style swap is settling, cleared once it
    // succeeds, fails, or is superseded by a newer swap.
    __publicField(this, "_cancelStyleWatch");
    __publicField(this, "_resizeHandler", null);
    __publicField(this, "_mapResizeHandler", null);
    __publicField(this, "_resizeAnchor", null);
    __publicField(this, "_resizeHandleEl", null);
    __publicField(this, "_onResizeMove", (event) => {
      if (!this._panel || !this._resizeAnchor) return;
      const { x, y, isLeft, isTop } = this._resizeAnchor;
      const bounds = this._getResizeBounds();
      const rawWidth = isLeft ? event.clientX - x : x - event.clientX;
      const rawHeight = isTop ? event.clientY - y : y - event.clientY;
      const width = this._clampSize(rawWidth, MIN_PANEL_WIDTH, bounds.maxWidth);
      const height = this._clampSize(rawHeight, MIN_PANEL_HEIGHT, bounds.maxHeight);
      this._panel.style.width = `${width}px`;
      this._panel.style.height = `${height}px`;
      this._panel.classList.add("is-resized");
      this._state = { ...this._state, panelWidth: width, panelHeight: height };
      this._updatePanelPosition();
    });
    __publicField(this, "_onResizeEnd", (event) => {
      var _a, _b;
      window.removeEventListener("pointermove", this._onResizeMove);
      window.removeEventListener("pointerup", this._onResizeEnd);
      window.removeEventListener("pointercancel", this._onResizeEnd);
      (_b = (_a = this._resizeHandleEl) == null ? void 0 : _a.releasePointerCapture) == null ? void 0 : _b.call(_a, event.pointerId);
      this._resizeHandleEl = null;
      if (!this._resizeAnchor) return;
      this._resizeAnchor = null;
      this._emit({ type: "statechange", state: this.getState() });
    });
    this._options = { ...DEFAULT_OPTIONS, ...options };
    this._mapTilerApiKey = (options == null ? void 0 : options.mapTilerApiKey) ?? "";
    this._cartoApiKey = (options == null ? void 0 : options.cartoApiKey) ?? "";
    this._amazonApiKey = (options == null ? void 0 : options.amazonApiKey) ?? "";
    this._awsRegion = (options == null ? void 0 : options.awsRegion) ?? "us-east-1";
    this._mapboxAccessToken = (options == null ? void 0 : options.mapboxAccessToken) ?? "";
    this._protomapsApiKey = (options == null ? void 0 : options.protomapsApiKey) ?? "";
    this._stadiaApiKey = (options == null ? void 0 : options.stadiaApiKey) ?? "";
    this._tiandituApiKey = (options == null ? void 0 : options.tiandituApiKey) ?? "";
    this._tomtomApiKey = (options == null ? void 0 : options.tomtomApiKey) ?? "";
    this._hereApiKey = (options == null ? void 0 : options.hereApiKey) ?? "";
    this._googleMapsApiKey = (options == null ? void 0 : options.googleMapsApiKey) ?? "";
    this._basemaps = createBasemapCatalog(
      options == null ? void 0 : options.basemaps,
      this._options.includeDefaultBasemaps
    );
    this._providers = resolveBasemapProviders(
      this._basemaps,
      options == null ? void 0 : options.providers,
      this._options.includeDefaultBasemaps
    );
    this._state = {
      collapsed: this._options.collapsed,
      panelWidth: this._options.panelWidth,
      activeBasemapId: this._options.defaultBasemapId,
      activeBasemapIds: this._options.defaultBasemapId ? [this._options.defaultBasemapId] : [],
      allowMultiple: this._options.allowMultiple,
      query: "",
      providerFilter: "",
      categoryFilter: "",
      beforeId: "",
      loading: false
    };
  }
  onAdd(map) {
    this._map = map;
    this._mapContainer = map.getContainer();
    this._container = this._createContainer();
    this._panel = this._createPanel();
    this._mapContainer.appendChild(this._panel);
    this._setupEventListeners();
    if (!this._state.collapsed) {
      this._panel.classList.add("expanded");
      requestAnimationFrame(() => this._updatePanelPosition());
    }
    this._renderContent();
    if (this._state.activeBasemapId) {
      this.setBasemap(this._state.activeBasemapId).catch(() => {
      });
    }
    return this._container;
  }
  onRemove() {
    var _a, _b, _c, _d, _e;
    if (this._resizeHandler) {
      window.removeEventListener("resize", this._resizeHandler);
      this._resizeHandler = null;
    }
    if (this._mapResizeHandler && this._map) {
      this._map.off("resize", this._mapResizeHandler);
      this._mapResizeHandler = null;
    }
    window.removeEventListener("pointermove", this._onResizeMove);
    window.removeEventListener("pointerup", this._onResizeEnd);
    window.removeEventListener("pointercancel", this._onResizeEnd);
    (_a = this._cancelStyleWatch) == null ? void 0 : _a.call(this);
    this._resizeAnchor = null;
    this._resizeHandleEl = null;
    (_c = (_b = this._panel) == null ? void 0 : _b.parentNode) == null ? void 0 : _c.removeChild(this._panel);
    (_e = (_d = this._container) == null ? void 0 : _d.parentNode) == null ? void 0 : _e.removeChild(this._container);
    this._map = void 0;
    this._mapContainer = void 0;
    this._container = void 0;
    this._panel = void 0;
    this._content = void 0;
    this._eventHandlers.clear();
  }
  getState() {
    return { ...this._state };
  }
  setState(newState) {
    this._state = { ...this._state, ...newState };
    this._syncActiveBasemapState(newState);
    this._renderContent();
    this._emit({ type: "statechange", state: this.getState() });
  }
  // Keeps `activeBasemapId` and `activeBasemapIds` consistent when a caller
  // updates only one of them through setState (the React wrapper and external
  // consumers commonly set just `activeBasemapId`).
  _syncActiveBasemapState(applied) {
    const hasId = "activeBasemapId" in applied;
    const hasIds = "activeBasemapIds" in applied;
    if (hasId && !hasIds) {
      const id = this._state.activeBasemapId;
      this._state = { ...this._state, activeBasemapIds: id ? [id] : [] };
    } else if (hasIds && !hasId) {
      const ids = this._state.activeBasemapIds;
      this._state = { ...this._state, activeBasemapId: ids[ids.length - 1] };
    }
  }
  getBasemaps() {
    return [...this._basemaps];
  }
  setBasemaps(basemaps) {
    this._basemaps = [...basemaps];
    this._providers = resolveBasemapProviders(
      this._basemaps,
      this._options.providers,
      this._options.includeDefaultBasemaps
    );
    const activeBasemapIds = this._state.activeBasemapIds.filter(
      (id) => this._basemaps.some((basemap) => basemap.id === id)
    );
    this._state = {
      ...this._state,
      activeBasemapIds,
      activeBasemapId: this._state.activeBasemapId && activeBasemapIds.includes(this._state.activeBasemapId) ? this._state.activeBasemapId : activeBasemapIds[activeBasemapIds.length - 1]
    };
    this._renderContent();
    this._emit({ type: "statechange", state: this.getState() });
  }
  setMapTilerApiKey(apiKey) {
    this._mapTilerApiKey = apiKey;
    this._clearError();
    this._renderContent();
    this._emit({ type: "statechange", state: this.getState() });
  }
  setCartoApiKey(apiKey) {
    this._cartoApiKey = apiKey;
    this._clearError();
    this._renderContent();
    this._emit({ type: "statechange", state: this.getState() });
  }
  setAmazonCredentials(apiKey, awsRegion = this._awsRegion) {
    this._amazonApiKey = apiKey;
    this._awsRegion = awsRegion;
    this._clearError();
    this._renderContent();
    this._emit({ type: "statechange", state: this.getState() });
  }
  setMapboxAccessToken(accessToken) {
    this._mapboxAccessToken = accessToken;
    this._clearError();
    this._renderContent();
    this._emit({ type: "statechange", state: this.getState() });
  }
  setProtomapsApiKey(apiKey) {
    this._protomapsApiKey = apiKey;
    this._clearError();
    this._renderContent();
    this._emit({ type: "statechange", state: this.getState() });
  }
  setStadiaApiKey(apiKey) {
    this._stadiaApiKey = apiKey;
    this._clearError();
    this._renderContent();
    this._emit({ type: "statechange", state: this.getState() });
  }
  setTiandituApiKey(apiKey) {
    this._tiandituApiKey = apiKey;
    this._clearError();
    this._renderContent();
    this._emit({ type: "statechange", state: this.getState() });
  }
  setTomTomApiKey(apiKey) {
    this._tomtomApiKey = apiKey;
    this._clearError();
    this._renderContent();
    this._emit({ type: "statechange", state: this.getState() });
  }
  setHereApiKey(apiKey) {
    this._hereApiKey = apiKey;
    this._clearError();
    this._renderContent();
    this._emit({ type: "statechange", state: this.getState() });
  }
  setGoogleMapsApiKey(apiKey) {
    this._googleMapsApiKey = apiKey;
    this._googleSessions.clear();
    this._clearError();
    this._renderContent();
    this._emit({ type: "statechange", state: this.getState() });
  }
  getActiveBasemap() {
    return this._basemaps.find((basemap) => basemap.id === this._state.activeBasemapId);
  }
  getActiveBasemaps() {
    return this._state.activeBasemapIds.map((id) => this._basemaps.find((basemap) => basemap.id === id)).filter((basemap) => Boolean(basemap));
  }
  isBasemapActive(id) {
    return this._state.activeBasemapIds.includes(id);
  }
  // Apply a basemap, replacing any previously active basemaps.
  async setBasemap(id) {
    return this._applyBasemapChange(id, "replace");
  }
  // Add a raster basemap as an additional overlay without removing the active
  // ones. Style basemaps cannot stack, so they always replace the map style.
  async addBasemap(id) {
    return this._applyBasemapChange(id, "add");
  }
  // Remove a previously added managed raster basemap from the map.
  async removeBasemap(id) {
    const basemap = this._basemaps.find((candidate) => candidate.id === id);
    if (!basemap) {
      const error = new Error(`Basemap "${id}" was not found.`);
      this._handleError(error);
      throw error;
    }
    if (!this._map) {
      const error = new Error("BasemapControl must be added to a map before removing a basemap.");
      this._handleError(error, basemap);
      throw error;
    }
    const managedRaster = this._removeManagedRaster(id);
    const activeBasemapIds = this._state.activeBasemapIds.filter((value) => value !== id);
    this._state = {
      ...this._state,
      activeBasemapIds,
      activeBasemapId: activeBasemapIds[activeBasemapIds.length - 1],
      error: void 0
    };
    this._renderContent(true);
    this._emit({ type: "basemapremove", state: this.getState(), basemap, managedRaster });
    this._emit({ type: "statechange", state: this.getState() });
  }
  // Add the basemap if it is not active, otherwise remove it.
  async toggleBasemap(id) {
    if (this.isBasemapActive(id)) {
      return this.removeBasemap(id);
    }
    return this.addBasemap(id);
  }
  async _applyBasemapChange(id, mode) {
    const basemap = this._basemaps.find((candidate) => candidate.id === id);
    if (!basemap) {
      const error = new Error(`Basemap "${id}" was not found.`);
      this._handleError(error);
      throw error;
    }
    if (!this._map) {
      const error = new Error("BasemapControl must be added to a map before setting a basemap.");
      this._handleError(error, basemap);
      throw error;
    }
    const isOverlay = basemap.source.type === "raster" || basemap.source.type === "vector-overlay";
    const effectiveMode = isOverlay ? mode : "replace";
    if (!isOverlay) {
      try {
        this._resolveStyleUrl(basemap);
      } catch (cause) {
        if (cause instanceof MissingCredentialError) {
          this._enterCredentialError(cause, basemap);
          throw cause;
        }
      }
    }
    if (!isOverlay && this._state.allowMultiple && this._managedRasters.size > 0 && this._options.confirmStyleReplace) {
      const replacedBasemapIds = [...this._managedRasters.keys()];
      let confirmed = false;
      try {
        confirmed = await this._options.confirmStyleReplace({ basemap, replacedBasemapIds });
      } catch {
        confirmed = false;
      }
      if (!confirmed) return;
    }
    this._state = { ...this._state, loading: true, error: void 0 };
    this._renderContent(true);
    this._emit({ type: "statechange", state: this.getState() });
    const previousActiveBasemapId = this._state.activeBasemapId;
    try {
      let managedRaster;
      let resolvedStyleUrl;
      if (isOverlay) {
        await this._waitForStyleReady();
        const resolvedRasterTiles = basemap.source.type === "raster" ? await this._resolveRasterTiles(basemap) : void 0;
        if (basemap.source.type === "vector-overlay") {
          this._resolveVectorOverlaySource(basemap, basemap.source);
        }
        if (effectiveMode === "replace") {
          this._removeManagedBasemap();
        } else {
          this._removeManagedRaster(basemap.id);
        }
        managedRaster = await this._addOverlay(basemap, resolvedRasterTiles);
      } else {
        const styleUrl = this._resolveStyleUrl(basemap);
        resolvedStyleUrl = styleUrl;
        const styleOptions = this._getStyleOptions(basemap);
        this._removeManagedBasemap();
        if (styleOptions) {
          this._map.setStyle(styleUrl, styleOptions);
        } else {
          this._map.setStyle(styleUrl);
        }
        this._watchStyleLoad(styleUrl, basemap, previousActiveBasemapId);
      }
      this._applyBasemapView(basemap);
      const activeBasemapIds = effectiveMode === "add" ? [...this._state.activeBasemapIds.filter((value) => value !== basemap.id), basemap.id] : [basemap.id];
      this._state = {
        ...this._state,
        activeBasemapId: basemap.id,
        activeBasemapIds,
        loading: false,
        error: void 0
      };
      this._optionalKeyBasemapId = this._basemapUsesKeylessFallback(basemap) ? basemap.id : void 0;
      this._renderContent(true);
      this._emit({
        type: "basemapchange",
        state: this.getState(),
        basemap,
        managedRaster,
        resolvedStyleUrl,
        mode: effectiveMode
      });
      this._emit({ type: "statechange", state: this.getState() });
    } catch (cause) {
      const error = cause instanceof Error ? cause : new Error(String(cause));
      if (error instanceof MissingCredentialError) {
        this._enterCredentialError(error, basemap);
      } else {
        this._state = { ...this._state, loading: false, error: error.message };
        this._missingCredentialProvider = void 0;
        this._renderContent(true);
        this._handleError(error, basemap);
      }
      throw error;
    }
  }
  // Watches the asynchronous style load that `setStyle` kicked off for a style
  // basemap, and rolls back to the previous basemap (reporting the failure
  // through the `error` event) when the new style cannot actually render. Two
  // failure modes are caught so a broken provider basemap never leaves a blank
  // map:
  //
  //   1. The style *document* request fails outright (matched by URL), e.g. an
  //      unreachable host or a descriptor that 404s. Detected whether or not
  //      `style.load` ever fires.
  //   2. The descriptor loads but the provider rejects the credentials when the
  //      first tiles are fetched (401/403). Amazon Location, for instance,
  //      serves the style JSON publicly but 403s every tile for a bad API key,
  //      so the descriptor "loads" while the map stays empty. This is only
  //      treated as fatal for credentialed providers, and only briefly after
  //      the descriptor loads, so an isolated transient tile error on a healthy
  //      basemap is ignored.
  _watchStyleLoad(styleUrl, basemap, previousActiveBasemapId) {
    var _a;
    const map = this._map;
    if (!map) return;
    (_a = this._cancelStyleWatch) == null ? void 0 : _a.call(this);
    const isCredentialed = basemap.provider in PROVIDER_CREDENTIAL_HELP;
    let settled = false;
    let graceTimer;
    const cleanup = () => {
      if (settled) return;
      settled = true;
      if (graceTimer !== void 0) clearTimeout(graceTimer);
      map.off("style.load", onLoad);
      map.off("error", onError);
      if (this._cancelStyleWatch === cleanup) this._cancelStyleWatch = void 0;
    };
    const fail = (cause) => {
      cleanup();
      this._handleStyleLoadFailure(basemap, previousActiveBasemapId, cause);
    };
    const onLoad = () => {
      if (!isCredentialed) {
        cleanup();
      } else if (graceTimer === void 0) {
        graceTimer = setTimeout(cleanup, STYLE_AUTH_GRACE_MS);
      }
    };
    const onError = (event) => {
      const error = event == null ? void 0 : event.error;
      if (extractErrorUrl(error) === styleUrl) {
        fail(error);
        return;
      }
      if (isCredentialed) {
        const status = extractErrorStatus(error);
        if (status === 401 || status === 403) fail(error);
      }
    };
    this._cancelStyleWatch = cleanup;
    map.once("style.load", onLoad);
    map.on("error", onError);
  }
  // Rolls back a failed style swap: restores the previously active basemap (when
  // it is a style basemap the control owns), then reports the failure inline and
  // through the `error` event. When the failing provider needs an API key, the
  // inline credential field is revealed so the user can correct the key and
  // retry without losing their map.
  _handleStyleLoadFailure(failedBasemap, previousActiveBasemapId, cause) {
    this._restorePreviousBasemap(previousActiveBasemapId, failedBasemap.id);
    const status = extractErrorStatus(cause);
    const credentialProvider = failedBasemap.provider in PROVIDER_CREDENTIAL_HELP ? failedBasemap.provider : void 0;
    const hint = credentialProvider ? " Check the API key and try again." : " Check your connection and try again.";
    const error = new BasemapLoadError(
      `Could not load the "${failedBasemap.name}" basemap${status ? ` (HTTP ${status})` : ""}.${hint}`,
      failedBasemap.provider,
      status
    );
    this._state = { ...this._state, loading: false, error: error.message };
    this._missingCredentialProvider = credentialProvider;
    this._lastFailedBasemapId = credentialProvider ? failedBasemap.id : void 0;
    this._activeView = "basemaps";
    this._renderContent(true);
    this._handleError(error, failedBasemap);
  }
  // Reapplies the previously active style basemap after a failed swap. Only a
  // control-owned style/vector-style basemap can be reapplied; when the previous
  // basemap is unknown, a raster overlay, or a style the host owns, the panel
  // state is pointed back at it (so the failed basemap is not highlighted) and
  // the host is left to restore its own style from the emitted `error` event.
  _restorePreviousBasemap(previousActiveBasemapId, failedBasemapId) {
    const map = this._map;
    const previous = previousActiveBasemapId && previousActiveBasemapId !== failedBasemapId ? this._basemaps.find((candidate) => candidate.id === previousActiveBasemapId) : void 0;
    const pointStateAtPrevious = () => {
      this._state = {
        ...this._state,
        activeBasemapId: previousActiveBasemapId,
        activeBasemapIds: previousActiveBasemapId ? [previousActiveBasemapId] : []
      };
    };
    if (!map || !previous || previous.source.type !== "style" && previous.source.type !== "vector-style") {
      pointStateAtPrevious();
      return;
    }
    try {
      const styleUrl = this._resolveStyleUrl(previous);
      const styleOptions = this._getStyleOptions(previous);
      this._removeManagedBasemap();
      if (styleOptions) {
        map.setStyle(styleUrl, styleOptions);
      } else {
        map.setStyle(styleUrl);
      }
      this._state = {
        ...this._state,
        activeBasemapId: previous.id,
        activeBasemapIds: [previous.id]
      };
      this._emit({
        type: "basemapchange",
        state: this.getState(),
        basemap: previous,
        resolvedStyleUrl: styleUrl,
        restored: true,
        mode: "replace"
      });
    } catch {
      pointStateAtPrevious();
    }
  }
  // The public mutators rethrow after emitting the error event so callers that
  // await them can react. The panel's click handler uses this instead to avoid
  // unhandled promise rejections; the failure is still reported via `error`.
  // In multiple mode a raster basemap click toggles the overlay on or off.
  _selectBasemap(id) {
    const basemap = this._basemaps.find((candidate) => candidate.id === id);
    const isOverlay = (basemap == null ? void 0 : basemap.source.type) === "raster" || (basemap == null ? void 0 : basemap.source.type) === "vector-overlay";
    if (this._state.allowMultiple && isOverlay) {
      this.toggleBasemap(id).catch(() => {
      });
      return;
    }
    this.setBasemap(id).catch(() => {
    });
  }
  toggle() {
    this._state = { ...this._state, collapsed: !this._state.collapsed };
    if (this._panel) {
      if (this._state.collapsed) {
        this._panel.classList.remove("expanded");
        this._emit({ type: "collapse", state: this.getState() });
      } else {
        this._panel.classList.add("expanded");
        this._updatePanelPosition();
        this._emit({ type: "expand", state: this.getState() });
      }
    }
    this._emit({ type: "statechange", state: this.getState() });
  }
  expand() {
    if (this._state.collapsed) this.toggle();
  }
  collapse() {
    if (!this._state.collapsed) this.toggle();
  }
  on(event, handler) {
    if (!this._eventHandlers.has(event)) {
      this._eventHandlers.set(event, /* @__PURE__ */ new Set());
    }
    this._eventHandlers.get(event).add(handler);
  }
  off(event, handler) {
    var _a;
    (_a = this._eventHandlers.get(event)) == null ? void 0 : _a.delete(handler);
  }
  getMap() {
    return this._map;
  }
  getContainer() {
    return this._container;
  }
  _emit(event) {
    var _a;
    (_a = this._eventHandlers.get(event.type)) == null ? void 0 : _a.forEach((handler) => handler(event));
  }
  _handleError(error, basemap) {
    this._emit({ type: "error", state: this.getState(), error, basemap });
    this._emit({ type: "statechange", state: this.getState() });
  }
  // Clears the current error and its associated missing-credential provider so
  // the inline credential field and help link disappear together.
  _clearError() {
    if (this._state.error === void 0 && this._missingCredentialProvider === void 0 && this._lastFailedBasemapId === void 0) {
      return;
    }
    this._state = { ...this._state, error: void 0 };
    this._missingCredentialProvider = void 0;
    this._lastFailedBasemapId = void 0;
  }
  // Records a missing-credential failure: stores the error, remembers the
  // provider (for the help link and inline field) and the basemap to retry, and
  // surfaces the basemaps view so the inline credential field beside the error
  // is visible (#837).
  _enterCredentialError(error, basemap) {
    this._state = { ...this._state, loading: false, error: error.message };
    this._missingCredentialProvider = error.provider;
    this._lastFailedBasemapId = basemap.id;
    this._activeView = "basemaps";
    this._renderContent(true);
    this._handleError(error, basemap);
  }
  _createContainer() {
    const container = document.createElement("div");
    container.className = `maplibregl-ctrl maplibregl-ctrl-group basemap-control${this._options.className ? ` ${this._options.className}` : ""}`;
    const toggleBtn = document.createElement("button");
    toggleBtn.className = "basemap-control-toggle";
    toggleBtn.type = "button";
    toggleBtn.title = this._options.title;
    toggleBtn.setAttribute("aria-label", this._options.title);
    toggleBtn.innerHTML = `
      <span class="basemap-control-icon" aria-hidden="true">
        <svg viewBox="0 0 24 24" width="22" height="22" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <path d="m3 6 6-3 6 3 6-3v15l-6 3-6-3-6 3V6Z"/>
          <path d="M9 3v15"/>
          <path d="M15 6v15"/>
        </svg>
      </span>
    `;
    toggleBtn.addEventListener("click", () => this.toggle());
    container.appendChild(toggleBtn);
    return container;
  }
  _createPanel() {
    const panel = document.createElement("div");
    panel.className = "basemap-control-panel";
    panel.style.width = `${this._state.panelWidth}px`;
    if (this._state.panelHeight !== void 0) {
      panel.style.height = `${this._state.panelHeight}px`;
      panel.classList.add("is-resized");
    }
    const header = document.createElement("div");
    header.className = "basemap-control-header";
    const title = document.createElement("span");
    title.className = "basemap-control-title";
    title.textContent = this._options.title;
    const settingsBtn = document.createElement("button");
    settingsBtn.className = "basemap-control-settings-toggle";
    settingsBtn.type = "button";
    settingsBtn.setAttribute("aria-label", "API keys");
    settingsBtn.title = "API keys";
    settingsBtn.innerHTML = `
      <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
        <path d="m21 2-2 2m-7.61 7.61a5.5 5.5 0 1 1-7.778 7.778 5.5 5.5 0 0 1 7.777-7.777zm0 0L15.5 7.5m0 0 3 3L22 7l-3-3m-3.5 3.5L19 4"/>
      </svg>
    `;
    settingsBtn.addEventListener("click", () => this._toggleSettingsView());
    this._settingsButton = settingsBtn;
    const closeBtn = document.createElement("button");
    closeBtn.className = "basemap-control-close";
    closeBtn.type = "button";
    closeBtn.setAttribute("aria-label", "Close basemap panel");
    closeBtn.innerHTML = "&times;";
    closeBtn.addEventListener("click", () => this.collapse());
    header.appendChild(title);
    header.appendChild(settingsBtn);
    header.appendChild(closeBtn);
    this._content = document.createElement("div");
    this._content.className = "basemap-control-content";
    panel.appendChild(header);
    panel.appendChild(this._content);
    if (this._options.resizable) {
      panel.appendChild(this._createResizeHandle("bottom-left"));
      panel.appendChild(this._createResizeHandle("bottom-right"));
    }
    return panel;
  }
  _createResizeHandle(corner) {
    const handle = document.createElement("div");
    handle.className = `basemap-control-resize-handle basemap-control-resize-${corner}`;
    handle.setAttribute("aria-hidden", "true");
    handle.addEventListener("pointerdown", (event) => this._startResize(event));
    return handle;
  }
  _renderContent(preserveResultsScroll = false) {
    var _a;
    if (!this._content) return;
    this._reconcileSettingsButton();
    if (this._activeView === "settings" && this._hasProviderSettings()) {
      this._content.replaceChildren(this._createSettingsView());
      return;
    }
    const categories = getBasemapCategories(this._basemaps);
    const results = this._getFilteredBasemaps();
    const previousResultsScrollTop = preserveResultsScroll ? (_a = this._content.querySelector(".basemap-control-results")) == null ? void 0 : _a.scrollTop : void 0;
    this._content.replaceChildren(
      this._createSearchRow(),
      ...this._options.showMultipleToggle ? [this._createMultipleToggleRow()] : [],
      this._createFilterRow(this._providers, categories),
      this._createStatus(results.length),
      this._createResults(results)
    );
    if (previousResultsScrollTop !== void 0) {
      const resultsElement = this._content.querySelector(".basemap-control-results");
      if (resultsElement) resultsElement.scrollTop = previousResultsScrollTop;
    }
  }
  // Show the key button only when the catalog actually needs a provider
  // credential, and reflect whether the settings view is currently open.
  _reconcileSettingsButton() {
    if (!this._settingsButton) return;
    const hasSettings = this._hasProviderSettings();
    this._settingsButton.hidden = !hasSettings;
    this._settingsButton.classList.toggle(
      "is-active",
      hasSettings && this._activeView === "settings"
    );
  }
  _toggleSettingsView() {
    if (!this._hasProviderSettings()) return;
    this._activeView = this._activeView === "settings" ? "basemaps" : "settings";
    this._renderContent();
    this._emit({ type: "statechange", state: this.getState() });
  }
  _renderFilteredResults() {
    var _a, _b;
    if (!this._content) return;
    const results = this._getFilteredBasemaps();
    (_a = this._content.querySelector(".basemap-control-status")) == null ? void 0 : _a.replaceWith(
      this._createStatus(results.length)
    );
    (_b = this._content.querySelector(".basemap-control-results")) == null ? void 0 : _b.replaceWith(
      this._createResults(results)
    );
  }
  _getFilteredBasemaps() {
    return filterBasemaps(this._basemaps, {
      query: this._state.query,
      provider: this._state.providerFilter,
      category: this._state.categoryFilter
    });
  }
  _createSearchRow() {
    const row = document.createElement("div");
    row.className = "basemap-control-search-row";
    row.appendChild(this._createSearchInput());
    row.appendChild(this._createBeforeIdInput());
    return row;
  }
  _createMultipleToggleRow() {
    const label = document.createElement("label");
    label.className = "basemap-control-multiple-toggle";
    const checkbox = document.createElement("input");
    checkbox.type = "checkbox";
    checkbox.className = "basemap-control-multiple-checkbox";
    checkbox.checked = this._state.allowMultiple;
    checkbox.setAttribute("aria-label", "Add basemaps instead of replacing");
    checkbox.addEventListener("change", () => {
      this._state = { ...this._state, allowMultiple: checkbox.checked };
      this._emit({ type: "statechange", state: this.getState() });
    });
    const text = document.createElement("span");
    text.className = "basemap-control-multiple-toggle-text";
    text.textContent = "Add basemaps (stack instead of replace)";
    label.appendChild(checkbox);
    label.appendChild(text);
    return label;
  }
  _createSearchInput() {
    const wrapper = document.createElement("div");
    wrapper.className = "basemap-control-search";
    const input = document.createElement("input");
    input.className = "basemap-control-input";
    input.type = "search";
    input.placeholder = "Search basemaps";
    input.value = this._state.query;
    input.setAttribute("aria-label", "Search basemaps");
    input.addEventListener("input", () => {
      var _a;
      const hadError = this._state.error !== void 0;
      this._state = { ...this._state, query: input.value };
      this._clearError();
      if (hadError) {
        this._renderContent();
        input.focus();
        const end = input.value.length;
        (_a = input.setSelectionRange) == null ? void 0 : _a.call(input, end, end);
      } else {
        this._renderFilteredResults();
      }
      this._emit({ type: "statechange", state: this.getState() });
    });
    wrapper.appendChild(input);
    return wrapper;
  }
  _createBeforeIdInput() {
    const wrapper = document.createElement("div");
    wrapper.className = "basemap-control-before-id";
    const input = document.createElement("input");
    input.className = "basemap-control-input";
    input.type = "text";
    input.placeholder = "before_id: none";
    input.value = this._state.beforeId;
    input.setAttribute("aria-label", "before_id");
    input.addEventListener("input", () => {
      this._state = { ...this._state, beforeId: input.value };
      this._emit({ type: "statechange", state: this.getState() });
    });
    wrapper.appendChild(input);
    return wrapper;
  }
  // The ordered set of provider credential fields, gated by whether the catalog
  // actually contains basemaps for each provider. A single source of truth for
  // both the centralized settings view and the inline field shown beside a
  // missing-credential error, so the two never drift (#837).
  _providerFieldDefs() {
    return [
      {
        provider: "carto",
        label: "CARTO",
        has: this._hasCartoBasemaps(),
        fields: [
          {
            className: "basemap-control-carto-key",
            type: "password",
            placeholder: "CARTO API key",
            ariaLabel: "CARTO API key",
            value: this._cartoApiKey,
            onInput: (value) => {
              this._cartoApiKey = value;
            }
          }
        ]
      },
      {
        provider: "maptiler",
        label: "MapTiler",
        has: this._hasMapTilerBasemaps(),
        fields: [
          {
            className: "basemap-control-maptiler-key",
            type: "password",
            placeholder: "MapTiler API key",
            ariaLabel: "MapTiler API key",
            value: this._mapTilerApiKey,
            onInput: (value) => {
              this._mapTilerApiKey = value;
            }
          }
        ]
      },
      {
        provider: "mapbox",
        label: "Mapbox",
        has: this._hasMapboxBasemaps(),
        fields: [
          {
            className: "basemap-control-mapbox-token",
            type: "password",
            placeholder: "Mapbox access token",
            ariaLabel: "Mapbox access token",
            value: this._mapboxAccessToken,
            onInput: (value) => {
              this._mapboxAccessToken = value;
            }
          }
        ]
      },
      {
        provider: "protomaps",
        label: "Protomaps",
        has: this._hasProtomapsBasemaps(),
        fields: [
          {
            className: "basemap-control-protomaps-key",
            type: "password",
            placeholder: "Protomaps API key",
            ariaLabel: "Protomaps API key",
            value: this._protomapsApiKey,
            onInput: (value) => {
              this._protomapsApiKey = value;
            }
          }
        ]
      },
      {
        provider: "stadia",
        label: "Stadia Maps",
        has: this._hasStadiaBasemaps(),
        fields: [
          {
            className: "basemap-control-stadia-key",
            type: "password",
            placeholder: "Stadia Maps API key",
            ariaLabel: "Stadia Maps API key",
            value: this._stadiaApiKey,
            onInput: (value) => {
              this._stadiaApiKey = value;
            }
          }
        ]
      },
      {
        provider: "tianditu",
        label: "Tianditu",
        has: this._hasTiandituBasemaps(),
        fields: [
          {
            className: "basemap-control-tianditu-key",
            type: "password",
            placeholder: "Tianditu API key",
            ariaLabel: "Tianditu API key",
            value: this._tiandituApiKey,
            onInput: (value) => {
              this._tiandituApiKey = value;
            }
          }
        ]
      },
      {
        provider: "tomtom",
        label: "TomTom",
        has: this._hasTomTomBasemaps(),
        fields: [
          {
            className: "basemap-control-tomtom-key",
            type: "password",
            placeholder: "TomTom API key",
            ariaLabel: "TomTom API key",
            value: this._tomtomApiKey,
            onInput: (value) => {
              this._tomtomApiKey = value;
            }
          }
        ]
      },
      {
        provider: "here",
        label: "HERE",
        has: this._hasHereBasemaps(),
        fields: [
          {
            className: "basemap-control-here-key",
            type: "password",
            placeholder: "HERE API key",
            ariaLabel: "HERE API key",
            value: this._hereApiKey,
            onInput: (value) => {
              this._hereApiKey = value;
            }
          }
        ]
      },
      {
        provider: "google",
        label: "Google",
        has: this._hasGoogleApiKeyBasemaps(),
        fields: [
          {
            className: "basemap-control-google-key",
            type: "password",
            placeholder: "Google Maps API key",
            ariaLabel: "Google Maps API key",
            value: this._googleMapsApiKey,
            onInput: (value) => {
              this._googleMapsApiKey = value;
              this._googleSessions.clear();
            }
          }
        ]
      },
      {
        provider: "amazon",
        label: "Amazon",
        has: this._hasAmazonBasemaps(),
        fields: [
          {
            className: "basemap-control-amazon-key",
            type: "password",
            placeholder: "Amazon API key",
            ariaLabel: "Amazon API key",
            value: this._amazonApiKey,
            onInput: (value) => {
              this._amazonApiKey = value;
            }
          },
          {
            className: "basemap-control-aws-region",
            type: "text",
            placeholder: "AWS region",
            ariaLabel: "AWS region",
            value: this._awsRegion,
            onInput: (value) => {
              this._awsRegion = value;
            }
          }
        ]
      }
    ];
  }
  // The dedicated API-keys view, opened from the header key button. It collects
  // every provider credential in one place, separate from the basemap list, so
  // the list itself stays free of input clutter (#837, Bug 5).
  _createSettingsView() {
    const view = document.createElement("div");
    view.className = "basemap-control-settings-view";
    const head = document.createElement("div");
    head.className = "basemap-control-settings-head";
    const back = document.createElement("button");
    back.type = "button";
    back.className = "basemap-control-settings-back";
    back.setAttribute("aria-label", "Back to basemaps");
    back.innerHTML = `
      <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
        <path d="m15 18-6-6 6-6"/>
      </svg>
      <span>Basemaps</span>
    `;
    back.addEventListener("click", () => this._toggleSettingsView());
    const heading = document.createElement("span");
    heading.className = "basemap-control-settings-heading";
    heading.textContent = "API keys";
    head.appendChild(back);
    head.appendChild(heading);
    view.appendChild(head);
    const intro = document.createElement("p");
    intro.className = "basemap-control-settings-intro";
    intro.textContent = "Add the credentials each provider requires to use its basemaps.";
    view.appendChild(intro);
    const fields = document.createElement("div");
    fields.className = "basemap-control-provider-settings-fields";
    for (const def of this._providerFieldDefs()) {
      if (def.has) fields.appendChild(this._createProviderFieldGroup(def));
    }
    view.appendChild(fields);
    return view;
  }
  _createProviderFieldGroup(def) {
    const group = document.createElement("div");
    group.className = `basemap-control-provider-group basemap-control-provider-group-${def.provider}`;
    const label = document.createElement("span");
    label.className = "basemap-control-provider-group-label";
    label.textContent = def.label;
    group.appendChild(label);
    for (const field of def.fields) {
      group.appendChild(this._createProviderSettingsInput(field));
    }
    return group;
  }
  // Renders the credential field(s) for the provider of the active
  // missing-credential error, inline beside the error message. Only that one
  // provider is shown, so the user is not asked to wade through every other
  // provider's inputs (#837, Bug 3). Returns null when no such error is active.
  _createInlineCredentialFields() {
    if (!this._state.error || !this._missingCredentialProvider) return null;
    const def = this._providerFieldDefs().find(
      (candidate) => candidate.provider === this._missingCredentialProvider && candidate.has
    );
    if (!def) return null;
    const wrapper = document.createElement("div");
    wrapper.className = "basemap-control-status-fields";
    for (const field of def.fields) {
      wrapper.appendChild(
        this._createProviderSettingsInput({
          ...field,
          // Keep the error (and this field) on screen while the user types, and
          // let Enter re-attempt the basemap that failed, so the field is not
          // yanked out from under the cursor on the first keystroke.
          rerenderOnInput: false,
          clearErrorOnInput: false,
          onEnter: () => this._retryLastFailedBasemap()
        })
      );
    }
    return wrapper;
  }
  _retryLastFailedBasemap() {
    if (this._lastFailedBasemapId) this._selectBasemap(this._lastFailedBasemapId);
  }
  // Renders the optional API key input shown after a basemap falls back to its
  // keyless public tiles, so the user can enter a key to upgrade to the
  // authorized provider tiles (or leave it blank to keep the public ones).
  // Returns null unless such a basemap is the active selection and still keyless.
  _createOptionalKeyPrompt() {
    const id = this._optionalKeyBasemapId;
    if (!id) return null;
    const basemap = this._basemaps.find((candidate) => candidate.id === id);
    if (!basemap || !this._state.activeBasemapIds.includes(id) || !this._basemapUsesKeylessFallback(basemap)) {
      return null;
    }
    const def = this._providerFieldDefs().find(
      (candidate) => candidate.provider === basemap.provider && candidate.has
    );
    if (!def) return null;
    const wrapper = document.createElement("div");
    wrapper.className = "basemap-control-optional-key";
    const message = document.createElement("span");
    message.className = "basemap-control-optional-key-message";
    message.textContent = `Enter a ${def.fields[0].placeholder} to load the official ${def.label} tiles.`;
    const help = PROVIDER_CREDENTIAL_HELP[def.provider];
    if (help) {
      message.appendChild(document.createTextNode(" "));
      const link = document.createElement("a");
      link.className = "basemap-control-status-link";
      link.href = help.url;
      link.target = "_blank";
      link.rel = "noopener noreferrer";
      link.textContent = help.label;
      message.appendChild(link);
    }
    wrapper.appendChild(message);
    const fields = document.createElement("div");
    fields.className = "basemap-control-status-fields";
    for (const field of def.fields) {
      fields.appendChild(
        this._createProviderSettingsInput({
          ...field,
          // Keep the field on screen while typing; Enter re-applies the basemap
          // so the freshly entered key takes effect immediately.
          rerenderOnInput: false,
          clearErrorOnInput: false,
          onEnter: () => this._reapplyBasemap(id)
        })
      );
    }
    wrapper.appendChild(fields);
    return wrapper;
  }
  _createProviderSettingsInput({
    className,
    type,
    placeholder,
    ariaLabel,
    value,
    onInput,
    rerenderOnInput = true,
    clearErrorOnInput = true,
    onEnter
  }) {
    const wrapper = document.createElement("div");
    wrapper.className = className;
    const input = document.createElement("input");
    input.className = "basemap-control-input";
    input.type = type;
    input.placeholder = placeholder;
    input.value = value;
    input.name = ariaLabel.toLowerCase().replace(/\s+/g, "-");
    input.autocomplete = "new-password";
    input.autocapitalize = "none";
    input.spellcheck = false;
    input.setAttribute("autocorrect", "off");
    input.setAttribute("aria-label", ariaLabel);
    input.addEventListener("input", () => {
      onInput(input.value);
      if (clearErrorOnInput) this._clearError();
      if (rerenderOnInput) this._renderFilteredResults();
      this._emit({ type: "statechange", state: this.getState() });
    });
    if (onEnter) {
      input.addEventListener("keydown", (event) => {
        if (event.key === "Enter") {
          event.preventDefault();
          onEnter();
        }
      });
    }
    wrapper.appendChild(input);
    return wrapper;
  }
  _createFilterRow(providers, categories) {
    const row = document.createElement("div");
    row.className = "basemap-control-filters";
    row.appendChild(
      this._createSelect(
        "Provider",
        "All providers",
        this._state.providerFilter,
        providers.map((provider) => ({ value: provider.id, label: provider.name })),
        (value) => {
          this._state = { ...this._state, providerFilter: value };
          this._clearError();
          this._renderContent();
          this._emit({ type: "statechange", state: this.getState() });
        }
      )
    );
    row.appendChild(
      this._createSelect(
        "Category",
        "All categories",
        this._state.categoryFilter,
        categories.map((category) => ({ value: category, label: category })),
        (value) => {
          this._state = { ...this._state, categoryFilter: value };
          this._clearError();
          this._renderContent();
          this._emit({ type: "statechange", state: this.getState() });
        }
      )
    );
    return row;
  }
  _createSelect(label, allLabel, value, options, onChange) {
    const select = document.createElement("select");
    select.className = "basemap-control-select";
    select.setAttribute("aria-label", label);
    const all = document.createElement("option");
    all.value = "";
    all.textContent = allLabel;
    select.appendChild(all);
    options.forEach((option) => {
      const element = document.createElement("option");
      element.value = option.value;
      element.textContent = option.label;
      select.appendChild(element);
    });
    select.value = value;
    select.addEventListener("change", () => onChange(select.value));
    return select;
  }
  _createStatus(resultCount) {
    const status = document.createElement("div");
    status.className = "basemap-control-status";
    if (this._state.loading) {
      status.textContent = "Applying basemap...";
    } else if (this._state.error) {
      status.classList.add("is-error");
      const message = document.createElement("span");
      message.className = "basemap-control-status-message";
      message.textContent = this._state.error;
      status.appendChild(message);
      const help = this._credentialHelpForError(this._missingCredentialProvider);
      if (help) {
        const actions = document.createElement("span");
        actions.className = "basemap-control-status-actions";
        const link = document.createElement("a");
        link.className = "basemap-control-status-link";
        link.href = help.url;
        link.target = "_blank";
        link.rel = "noopener noreferrer";
        link.textContent = help.label;
        actions.appendChild(link);
        const hint = document.createElement("span");
        hint.className = "basemap-control-status-hint";
        hint.textContent = ", then enter it below and press Enter.";
        actions.appendChild(hint);
        status.appendChild(actions);
      }
      const inlineFields = this._createInlineCredentialFields();
      if (inlineFields) status.appendChild(inlineFields);
    } else {
      const count = document.createElement("span");
      count.className = "basemap-control-status-message";
      count.textContent = `${resultCount} basemap${resultCount === 1 ? "" : "s"}`;
      status.appendChild(count);
      const optionalKey = this._createOptionalKeyPrompt();
      if (optionalKey) {
        status.classList.add("has-optional-key");
        status.appendChild(optionalKey);
      }
    }
    return status;
  }
  // Resolves the help link for a missing-credential provider, so the status can
  // offer a concrete next step. Returns undefined when there is no such error.
  _credentialHelpForError(provider) {
    return provider ? PROVIDER_CREDENTIAL_HELP[provider] : void 0;
  }
  _createResults(results) {
    const list = document.createElement("div");
    list.className = "basemap-control-results";
    if (results.length === 0) {
      const empty = document.createElement("div");
      empty.className = "basemap-control-empty";
      empty.textContent = "No basemaps match your search.";
      list.appendChild(empty);
      return list;
    }
    results.forEach((basemap) => {
      const row = document.createElement("button");
      row.type = "button";
      row.className = "basemap-control-result";
      row.dataset.basemapId = basemap.id;
      if (this._state.activeBasemapIds.includes(basemap.id)) {
        row.classList.add("is-active");
        row.setAttribute("aria-current", "true");
      }
      row.disabled = this._state.loading;
      row.addEventListener("click", () => {
        this._selectBasemap(basemap.id);
      });
      const main = document.createElement("span");
      main.className = "basemap-control-result-main";
      const name = document.createElement("span");
      name.className = "basemap-control-result-name";
      name.textContent = basemap.name;
      const meta = document.createElement("span");
      meta.className = "basemap-control-result-meta";
      meta.textContent = this._formatBasemapMeta(basemap);
      main.appendChild(name);
      main.appendChild(meta);
      const type = document.createElement("span");
      type.className = "basemap-control-result-type";
      type.textContent = basemap.type === "raster" ? "Raster" : basemap.type === "vector-overlay" ? "Overlay" : "Style";
      row.appendChild(main);
      row.appendChild(type);
      if (basemap.attribution) {
        const attribution = document.createElement("span");
        attribution.className = "basemap-control-result-attribution";
        attribution.textContent = this._stripHtml(basemap.attribution);
        row.appendChild(attribution);
      }
      list.appendChild(row);
    });
    return list;
  }
  _formatBasemapMeta(basemap) {
    const provider = this._providers.find((candidate) => candidate.id === basemap.provider);
    return [(provider == null ? void 0 : provider.name) ?? basemap.provider, basemap.category].filter(Boolean).join(" / ");
  }
  _stripHtml(value) {
    const template = document.createElement("template");
    template.innerHTML = value;
    return template.content.textContent ?? value;
  }
  _hasMapTilerBasemaps() {
    return this._basemaps.some((basemap) => basemap.provider === "maptiler");
  }
  _hasAmazonBasemaps() {
    return this._basemaps.some((basemap) => basemap.provider === "amazon");
  }
  _hasMapboxBasemaps() {
    return this._basemaps.some((basemap) => basemap.provider === "mapbox");
  }
  _hasProtomapsBasemaps() {
    return this._basemaps.some((basemap) => basemap.provider === "protomaps");
  }
  _hasCartoBasemaps() {
    return this._basemaps.some((basemap) => basemap.provider === "carto");
  }
  _hasStadiaBasemaps() {
    return this._basemaps.some((basemap) => basemap.provider === "stadia");
  }
  _hasTiandituBasemaps() {
    return this._basemaps.some((basemap) => basemap.provider === "tianditu");
  }
  _hasTomTomBasemaps() {
    return this._basemaps.some((basemap) => basemap.provider === "tomtom");
  }
  _hasHereBasemaps() {
    return this._basemaps.some((basemap) => basemap.provider === "here");
  }
  // True when a Google basemap can use a Map Tiles API key. Session-based Google
  // layers (Google Traffic, plus the base Maps/Satellite/Terrain/Hybrid layers
  // that upgrade to the authorized Map Tiles API when a key is present) and any
  // api-key based Google tiles reveal the key input.
  _hasGoogleApiKeyBasemaps() {
    return this._basemaps.some(
      (basemap) => basemap.provider === "google" && basemap.source.type === "raster" && (Boolean(basemap.source.googleSession) || basemap.source.tiles.some((tile) => tile.includes(API_KEY_PLACEHOLDER)))
    );
  }
  _hasProviderSettings() {
    return this._hasMapTilerBasemaps() || this._hasCartoBasemaps() || this._hasAmazonBasemaps() || this._hasMapboxBasemaps() || this._hasProtomapsBasemaps() || this._hasStadiaBasemaps() || this._hasTiandituBasemaps() || this._hasTomTomBasemaps() || this._hasHereBasemaps() || this._hasGoogleApiKeyBasemaps();
  }
  _resolveStyleUrl(basemap) {
    if (basemap.source.type !== "style" && basemap.source.type !== "vector-style") {
      throw new Error(`Basemap "${basemap.id}" is not a style basemap.`);
    }
    const url = basemap.source.url;
    if (basemap.provider === "amazon") {
      return this._resolveAmazonStyleUrl(url);
    }
    if (basemap.provider === "maptiler") {
      return this._resolveMapTilerStyleUrl(url);
    }
    if (basemap.provider === "mapbox") {
      return this._resolveMapboxStyleUrl(url);
    }
    if (basemap.provider === "protomaps") {
      return this._resolveProtomapsStyleUrl(url);
    }
    return url;
  }
  _resolveProtomapsStyleUrl(url) {
    if (!url.includes(API_KEY_PLACEHOLDER)) return url;
    const apiKey = this._protomapsApiKey.trim();
    if (!apiKey) {
      throw new MissingCredentialError(
        "Enter a Protomaps API key before applying this basemap.",
        "protomaps"
      );
    }
    return url.split(API_KEY_PLACEHOLDER).join(encodeURIComponent(apiKey));
  }
  _getStyleOptions(basemap) {
    if (basemap.provider === "mapbox") {
      return {
        validate: false,
        transformStyle: (_previousStyle, nextStyle) => this._transformMapboxStyle(nextStyle, this._mapboxAccessToken.trim())
      };
    }
    return void 0;
  }
  _transformMapboxStyle(style, accessToken) {
    const encodedAccessToken = encodeURIComponent(accessToken);
    const sources = Object.fromEntries(
      Object.entries(style.sources).map(([id, source]) => {
        if ("url" in source && typeof source.url === "string") {
          return [id, { ...source, url: this._resolveMapboxInternalUrl(source.url, encodedAccessToken) }];
        }
        return [id, source];
      })
    );
    return {
      ...style,
      glyphs: typeof style.glyphs === "string" ? this._resolveMapboxInternalUrl(style.glyphs, encodedAccessToken) : style.glyphs,
      sprite: this._resolveMapboxSprite(style.sprite, encodedAccessToken),
      projection: { type: "mercator" },
      sources
    };
  }
  _resolveMapboxSprite(sprite, encodedAccessToken) {
    if (typeof sprite === "string") {
      return this._resolveMapboxInternalUrl(sprite, encodedAccessToken);
    }
    if (Array.isArray(sprite)) {
      return sprite.map((item) => ({
        ...item,
        url: this._resolveMapboxInternalUrl(item.url, encodedAccessToken)
      }));
    }
    return sprite;
  }
  _resolveMapboxInternalUrl(url, encodedAccessToken) {
    if (url.startsWith("mapbox://sprites/")) {
      const [, owner, styleId] = /^mapbox:\/\/sprites\/([^/]+)\/(.+)$/.exec(url) ?? [];
      if (owner && styleId) {
        return `https://api.mapbox.com/styles/v1/${owner}/${styleId}/sprite?access_token=${encodedAccessToken}`;
      }
    }
    if (url.startsWith("mapbox://fonts/")) {
      const [, owner, fontPath] = /^mapbox:\/\/fonts\/([^/]+)\/(.+)$/.exec(url) ?? [];
      if (owner && fontPath) {
        return `https://api.mapbox.com/fonts/v1/${owner}/${fontPath}?access_token=${encodedAccessToken}`;
      }
    }
    if (url.startsWith("mapbox://")) {
      const tileset = url.replace(/^mapbox:\/\//, "");
      return `https://api.mapbox.com/v4/${tileset}.json?secure&access_token=${encodedAccessToken}`;
    }
    return url;
  }
  _resolveMapTilerStyleUrl(url) {
    const needsMapTilerKey = url.includes(API_KEY_PLACEHOLDER) || url.includes(MAPTILER_API_KEY_EXAMPLE) || url.endsWith(MAPTILER_API_KEY_QUERY) || url.endsWith(MAPTILER_API_KEY_EMPTY_QUERY);
    if (!needsMapTilerKey) return url;
    const apiKey = this._mapTilerApiKey.trim();
    if (!apiKey) {
      throw new MissingCredentialError(
        "Enter a MapTiler API key before applying this basemap.",
        "maptiler"
      );
    }
    const encodedApiKey = encodeURIComponent(apiKey);
    if (url.endsWith(MAPTILER_API_KEY_QUERY)) {
      return `${url}=${encodedApiKey}`;
    }
    if (url.endsWith(MAPTILER_API_KEY_EMPTY_QUERY)) {
      return `${url}${encodedApiKey}`;
    }
    return url.split(API_KEY_PLACEHOLDER).join(encodedApiKey).split(MAPTILER_API_KEY_EXAMPLE).join(encodedApiKey);
  }
  _resolveAmazonStyleUrl(url) {
    const apiKey = this._amazonApiKey.trim();
    const awsRegion = this._awsRegion.trim();
    if (url.includes(API_KEY_PLACEHOLDER) && !apiKey) {
      throw new MissingCredentialError(
        "Enter an Amazon API key before applying this basemap.",
        "amazon"
      );
    }
    if (url.includes(AWS_REGION_PLACEHOLDER) && !awsRegion) {
      throw new MissingCredentialError(
        "Enter an AWS region before applying this basemap.",
        "amazon"
      );
    }
    return url.split(AWS_REGION_PLACEHOLDER).join(awsRegion).split(API_KEY_PLACEHOLDER).join(encodeURIComponent(apiKey));
  }
  _resolveMapboxStyleUrl(url) {
    const accessToken = this._mapboxAccessToken.trim();
    if (url.includes(API_KEY_PLACEHOLDER) && !accessToken) {
      throw new MissingCredentialError(
        "Enter a Mapbox access token before applying this basemap.",
        "mapbox"
      );
    }
    if (this._isUrlLikeCredential(accessToken)) {
      throw new MissingCredentialError(
        "Enter a valid Mapbox access token, not a URL.",
        "mapbox"
      );
    }
    return url.split(API_KEY_PLACEHOLDER).join(encodeURIComponent(accessToken));
  }
  _isUrlLikeCredential(value) {
    return /^https?:\/\//i.test(value);
  }
  // Add a stackable overlay (raster tiles or a vector overlay) to the map,
  // resolving any provider credentials first.
  async _addOverlay(basemap, resolvedRasterTiles) {
    if (basemap.source.type === "vector-overlay") {
      return this._addVectorOverlay(basemap, basemap.source);
    }
    return this._addRasterBasemap(basemap, resolvedRasterTiles);
  }
  async _addRasterBasemap(basemap, resolvedTiles) {
    if (!this._map || basemap.source.type !== "raster") return void 0;
    const tiles = resolvedTiles ?? await this._resolveRasterTiles(basemap);
    const sourceId = `${CONTROL_SOURCE_PREFIX}-${basemap.id}`;
    const layerId = [CONTROL_LAYER_PREFIX, basemap.id].filter(Boolean).join("-");
    const beforeId = this._getBasemapInsertBeforeId();
    const source = {
      type: "raster",
      tiles,
      tileSize: basemap.source.tileSize ?? 256,
      minzoom: basemap.source.minzoom,
      maxzoom: basemap.source.maxzoom,
      scheme: basemap.source.scheme,
      attribution: basemap.attribution
    };
    const layer = {
      id: layerId,
      type: "raster",
      source: sourceId
    };
    this._map.addSource(sourceId, source);
    this._map.addLayer(layer, beforeId);
    const managed = { sourceId, layerId, beforeId };
    this._managedRasters.set(basemap.id, managed);
    return managed;
  }
  _addVectorOverlay(basemap, overlay) {
    if (!this._map) return void 0;
    const sourceId = `${CONTROL_SOURCE_PREFIX}-${basemap.id}`;
    const layerId = [CONTROL_LAYER_PREFIX, basemap.id].filter(Boolean).join("-");
    const beforeId = this._getBasemapInsertBeforeId();
    const source = {
      type: "vector",
      ...this._resolveVectorOverlaySource(basemap, overlay),
      minzoom: overlay.minzoom,
      maxzoom: overlay.maxzoom,
      attribution: basemap.attribution
    };
    const layer = {
      id: layerId,
      type: overlay.layerType ?? "line",
      source: sourceId,
      "source-layer": overlay.sourceLayer,
      ...overlay.layout ? { layout: overlay.layout } : {},
      ...overlay.paint ? { paint: overlay.paint } : {}
    };
    this._map.addSource(sourceId, source);
    this._map.addLayer(layer, beforeId);
    const managed = { sourceId, layerId, beforeId };
    this._managedRasters.set(basemap.id, managed);
    return managed;
  }
  // Resolves the `{url}` or `{tiles}` of a vector overlay, substituting provider
  // credentials. Mapbox vector overlays are pointed at the v4 TileJSON endpoint
  // with the access token, reusing the same resolver as Mapbox style sources.
  _resolveVectorOverlaySource(basemap, overlay) {
    if (basemap.provider === "mapbox") {
      const accessToken = this._mapboxAccessToken.trim();
      if (!accessToken) {
        throw new MissingCredentialError(
          "Enter a Mapbox access token before applying this overlay.",
          "mapbox"
        );
      }
      if (this._isUrlLikeCredential(accessToken)) {
        throw new MissingCredentialError(
          "Enter a valid Mapbox access token, not a URL.",
          "mapbox"
        );
      }
      const encoded = encodeURIComponent(accessToken);
      if (overlay.url) {
        return { url: this._resolveMapboxInternalUrl(overlay.url, encoded) };
      }
    }
    if (overlay.url) return { url: overlay.url };
    if (overlay.tiles) return { tiles: overlay.tiles };
    throw new Error(`Vector overlay "${basemap.id}" has no url or tiles.`);
  }
  // Resolves the tile templates of a raster basemap, substituting provider
  // credentials (and, for Google, a Map Tiles API session token). Throws a
  // MissingCredentialError when a required key is absent so the panel can
  // surface a "Get a ..." link and reveal the credential inputs.
  async _resolveRasterTiles(basemap) {
    if (basemap.source.type !== "raster") return [];
    const { tiles, googleSession, sessionTiles } = basemap.source;
    if (googleSession) {
      const templates = (sessionTiles == null ? void 0 : sessionTiles.length) ? sessionTiles : tiles;
      if (this._googleMapsApiKey.trim() || !(sessionTiles == null ? void 0 : sessionTiles.length)) {
        return this._resolveGoogleSessionTiles(templates, googleSession);
      }
      return tiles;
    }
    if (!tiles.some((tile) => tile.includes(API_KEY_PLACEHOLDER))) {
      return tiles;
    }
    const apiKey = this._rasterApiKeyFor(basemap.provider);
    if (!apiKey) {
      throw this._missingRasterKeyError(basemap.provider);
    }
    const encoded = encodeURIComponent(apiKey);
    return tiles.map((tile) => tile.split(API_KEY_PLACEHOLDER).join(encoded));
  }
  _rasterApiKeyFor(provider) {
    if (provider === "carto") return this._cartoApiKey.trim();
    if (provider === "tomtom") return this._tomtomApiKey.trim();
    if (provider === "here") return this._hereApiKey.trim();
    if (provider === "stadia") return this._stadiaApiKey.trim();
    if (provider === "tianditu") return this._tiandituApiKey.trim();
    if (provider === "google") return this._googleMapsApiKey.trim();
    return "";
  }
  // True when a basemap is (or would be) served from its public keyless `tiles`
  // because its provider API key is not set. Drives the optional key prompt:
  // these basemaps work without a key but can upgrade to the authorized
  // provider tiles (`sessionTiles`) once one is entered.
  _basemapUsesKeylessFallback(basemap) {
    var _a;
    return basemap.source.type === "raster" && Boolean(basemap.source.googleSession) && (((_a = basemap.source.sessionTiles) == null ? void 0 : _a.length) ?? 0) > 0 && !this._rasterApiKeyFor(basemap.provider);
  }
  // Re-applies an already-active basemap so a newly entered key takes effect.
  // Unlike `_selectBasemap`, this never toggles the basemap off in multiple
  // mode: a stacked raster is re-added on top (replacing its prior instance),
  // and a single-mode basemap is simply re-set.
  _reapplyBasemap(id) {
    const basemap = this._basemaps.find((candidate) => candidate.id === id);
    const isOverlay = (basemap == null ? void 0 : basemap.source.type) === "raster" || (basemap == null ? void 0 : basemap.source.type) === "vector-overlay";
    if (this._state.allowMultiple && isOverlay) {
      this.addBasemap(id).catch(() => {
      });
    } else {
      this.setBasemap(id).catch(() => {
      });
    }
  }
  _missingRasterKeyError(provider) {
    const label = RASTER_KEY_LABELS[provider] ?? "API key";
    const helpProvider = provider in PROVIDER_CREDENTIAL_HELP ? provider : "maptiler";
    return new MissingCredentialError(`Enter a ${label} before applying this layer.`, helpProvider);
  }
  // Resolves Google tile templates by minting (or reusing) a Map Tiles API
  // session token, then substituting both `{session}` and `{api-key}`.
  async _resolveGoogleSessionTiles(tiles, config) {
    const apiKey = this._googleMapsApiKey.trim();
    if (!apiKey) {
      throw new MissingCredentialError(
        "Enter a Google Maps API key before applying this layer.",
        "google"
      );
    }
    const token = await this._getGoogleSessionToken(apiKey, config);
    const encodedKey = encodeURIComponent(apiKey);
    const encodedSession = encodeURIComponent(token);
    return tiles.map(
      (tile) => tile.split("{session}").join(encodedSession).split(API_KEY_PLACEHOLDER).join(encodedKey)
    );
  }
  async _getGoogleSessionToken(apiKey, config) {
    const cacheKey = `${apiKey}:${JSON.stringify(config)}`;
    const cached = this._googleSessions.get(cacheKey);
    if (cached && cached.expiry - 6e4 > Date.now()) {
      return cached.token;
    }
    const response = await fetch(
      `https://tile.googleapis.com/v1/createSession?key=${encodeURIComponent(apiKey)}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          mapType: config.mapType,
          language: config.language ?? "en-US",
          region: config.region ?? "US",
          layerTypes: config.layerTypes,
          overlay: config.overlay
        })
      }
    );
    if (!response.ok) {
      const detail = await response.text().catch(() => "");
      throw new MissingCredentialError(
        `Google could not create a tile session (HTTP ${response.status}). ${this._summarizeGoogleError(
          detail
        )}`.trim(),
        "google"
      );
    }
    const data = await response.json();
    if (!data.session) {
      throw new MissingCredentialError(
        "Google did not return a tile session token. Check that the Map Tiles API is enabled for your key.",
        "google"
      );
    }
    const expirySeconds = data.expiry ? Number(data.expiry) : NaN;
    const expiry = Number.isFinite(expirySeconds) ? expirySeconds * 1e3 : Date.now() + 60 * 60 * 1e3;
    this._googleSessions.set(cacheKey, { token: data.session, expiry });
    return data.session;
  }
  _summarizeGoogleError(detail) {
    var _a;
    if (!detail) return "";
    try {
      const parsed = JSON.parse(detail);
      return ((_a = parsed.error) == null ? void 0 : _a.message) ?? "";
    } catch {
      return detail.slice(0, 200);
    }
  }
  _waitForStyleReady() {
    if (!this._map) return Promise.resolve();
    if (typeof this._map.isStyleLoaded !== "function" || this._map.isStyleLoaded()) {
      return Promise.resolve();
    }
    return new Promise((resolve) => {
      var _a, _b;
      let settled = false;
      let timer;
      const done = () => {
        var _a2, _b2;
        if (settled) return;
        settled = true;
        if (timer !== void 0) clearTimeout(timer);
        (_a2 = this._map) == null ? void 0 : _a2.off("load", done);
        (_b2 = this._map) == null ? void 0 : _b2.off("style.load", done);
        resolve();
      };
      timer = setTimeout(done, 1500);
      (_a = this._map) == null ? void 0 : _a.once("load", done);
      (_b = this._map) == null ? void 0 : _b.once("style.load", done);
    });
  }
  // Remove every managed raster basemap from the map.
  _removeManagedBasemap() {
    if (!this._map) return;
    for (const id of [...this._managedRasters.keys()]) {
      this._removeManagedRaster(id);
    }
  }
  // Remove a single managed raster basemap by its basemap id, returning the
  // managed source/layer record that was removed (if any).
  _removeManagedRaster(id) {
    var _a, _b;
    const managed = this._managedRasters.get(id);
    if (!managed) return void 0;
    if ((_a = this._map) == null ? void 0 : _a.getLayer(managed.layerId)) {
      this._map.removeLayer(managed.layerId);
    }
    if ((_b = this._map) == null ? void 0 : _b.getSource(managed.sourceId)) {
      this._map.removeSource(managed.sourceId);
    }
    this._managedRasters.delete(id);
    return managed;
  }
  _applyBasemapView(basemap) {
    if (!this._map || !basemap.view) return;
    this._map.jumpTo({
      center: basemap.view.center,
      zoom: basemap.view.zoom,
      bearing: basemap.view.bearing,
      pitch: basemap.view.pitch
    });
  }
  _getBasemapInsertBeforeId() {
    const beforeId = this._state.beforeId.trim();
    if (!beforeId || beforeId.toLowerCase() === "none") return void 0;
    return beforeId;
  }
  _setupEventListeners() {
    var _a;
    this._resizeHandler = () => {
      if (!this._state.collapsed) this._updatePanelPosition();
    };
    window.addEventListener("resize", this._resizeHandler);
    this._mapResizeHandler = () => {
      if (!this._state.collapsed) this._updatePanelPosition();
    };
    (_a = this._map) == null ? void 0 : _a.on("resize", this._mapResizeHandler);
  }
  _getControlPosition() {
    var _a;
    const parent = (_a = this._container) == null ? void 0 : _a.parentElement;
    if (!parent) return this._options.position;
    if (parent.classList.contains("maplibregl-ctrl-top-left")) return "top-left";
    if (parent.classList.contains("maplibregl-ctrl-top-right")) return "top-right";
    if (parent.classList.contains("maplibregl-ctrl-bottom-left")) return "bottom-left";
    if (parent.classList.contains("maplibregl-ctrl-bottom-right")) return "bottom-right";
    return this._options.position;
  }
  _updatePanelPosition() {
    if (!this._container || !this._panel || !this._mapContainer) return;
    const button = this._container.querySelector(".basemap-control-toggle");
    if (!button) return;
    const buttonRect = button.getBoundingClientRect();
    const mapRect = this._mapContainer.getBoundingClientRect();
    const position = this._getControlPosition();
    const buttonTop = buttonRect.top - mapRect.top;
    const buttonBottom = mapRect.bottom - buttonRect.bottom;
    const buttonLeft = buttonRect.left - mapRect.left;
    const buttonRight = mapRect.right - buttonRect.right;
    const panelGap = 5;
    this._panel.style.top = "";
    this._panel.style.bottom = "";
    this._panel.style.left = "";
    this._panel.style.right = "";
    switch (position) {
      case "top-left":
        this._panel.style.top = `${buttonTop + buttonRect.height + panelGap}px`;
        this._panel.style.left = `${buttonLeft}px`;
        break;
      case "top-right":
        this._panel.style.top = `${buttonTop + buttonRect.height + panelGap}px`;
        this._panel.style.right = `${buttonRight}px`;
        break;
      case "bottom-left":
        this._panel.style.bottom = `${buttonBottom + buttonRect.height + panelGap}px`;
        this._panel.style.left = `${buttonLeft}px`;
        break;
      case "bottom-right":
        this._panel.style.bottom = `${buttonBottom + buttonRect.height + panelGap}px`;
        this._panel.style.right = `${buttonRight}px`;
        break;
    }
  }
  // Begin a panel resize from a bottom corner. The panel stays pinned to its
  // toggle button, so resizing is measured from the button-anchored corner:
  // dragging either bottom handle grows or shrinks the panel away from it.
  _startResize(event) {
    var _a;
    if (!this._panel) return;
    event.preventDefault();
    event.stopPropagation();
    const position = this._getControlPosition();
    const isLeft = position === "top-left" || position === "bottom-left";
    const isTop = position === "top-left" || position === "top-right";
    const rect = this._panel.getBoundingClientRect();
    this._resizeAnchor = {
      x: isLeft ? rect.left : rect.right,
      y: isTop ? rect.top : rect.bottom,
      isLeft,
      isTop
    };
    const handle = event.currentTarget;
    this._resizeHandleEl = handle;
    (_a = handle.setPointerCapture) == null ? void 0 : _a.call(handle, event.pointerId);
    window.addEventListener("pointermove", this._onResizeMove);
    window.addEventListener("pointerup", this._onResizeEnd);
    window.addEventListener("pointercancel", this._onResizeEnd);
  }
  _getResizeBounds() {
    var _a;
    const mapRect = (_a = this._mapContainer) == null ? void 0 : _a.getBoundingClientRect();
    const availableWidth = ((mapRect == null ? void 0 : mapRect.width) ?? window.innerWidth) - PANEL_VIEWPORT_MARGIN * 2;
    const availableHeight = ((mapRect == null ? void 0 : mapRect.height) ?? window.innerHeight) - PANEL_VIEWPORT_MARGIN * 2;
    return {
      maxWidth: Math.max(MIN_PANEL_WIDTH, availableWidth),
      maxHeight: Math.max(MIN_PANEL_HEIGHT, availableHeight)
    };
  }
  _clampSize(value, min, max) {
    return Math.round(Math.min(Math.max(value, min), max));
  }
}
export {
  BasemapControl as B,
  DEFAULT_BASEMAPS as D,
  DEFAULT_BASEMAP_PROVIDERS as a,
  createBasemapCatalog as b,
  combineProviders as c,
  filterBasemaps as f,
  getBasemapCategories as g,
  resolveBasemapProviders as r
};
export { BasemapControl, DEFAULT_BASEMAPS, DEFAULT_BASEMAP_PROVIDERS, createBasemapCatalog, filterBasemaps, getBasemapCategories, resolveBasemapProviders };
