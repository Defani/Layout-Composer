# GeoLibre Layout Composer

**Cartographic layout designer for [GeoLibre](https://plugins.geolibre.app)**. Design publication-ready maps with map frames, coordinate grids, legends, matplotlib-style color bars, attribute tables and charts from your layers, LaTeX formulas, icon catalogs, GeoPDF export and QGIS template exchange, without leaving GeoLibre.

![Version](https://img.shields.io/badge/version-1.8.0-0d99ff)
![License: MIT](https://img.shields.io/badge/license-MIT-green)
![GeoLibre plugin](https://img.shields.io/badge/GeoLibre-plugin-4e8a2e)
![Tag: cartography](https://img.shields.io/badge/tag-cartography-6a3d9a)
![ES module](https://img.shields.io/badge/JavaScript-ES%20module-f7df1e?logo=javascript&logoColor=black)
![MapLibre GL JS](https://img.shields.io/badge/MapLibre%20GL%20JS-host%20engine-396CB2?logo=maplibre&logoColor=white)
![MathJax](https://img.shields.io/badge/MathJax-3.2.2-1B3E6F)
![jsPDF](https://img.shields.io/badge/jsPDF-2.5.1-c0392b)
![svg2pdf.js](https://img.shields.io/badge/svg2pdf.js-2.2.4-8e44ad)
![Maki](https://img.shields.io/badge/icons-Maki%20CC0-1f78b4)
![Temaki](https://img.shields.io/badge/icons-Temaki%20CC0-1f78b4)
![Material Symbols](https://img.shields.io/badge/icons-Material%20Symbols%20Apache--2.0-4285F4?logo=google&logoColor=white)
![Google Fonts](https://img.shields.io/badge/fonts-Google%20Fonts%20(2000%2B)-4285F4?logo=googlefonts&logoColor=white)
![KLHK layout](https://img.shields.io/badge/layout-SK%20MENLHK%20399%2F2024-02ad00)
![QGIS templates](https://img.shields.io/badge/QGIS-.qpt%20import%20%2F%20export-589632?logo=qgis&logoColor=white)

Author: **Defani Arman Alfitriansyah** · Repository: <https://github.com/Defani/Geolibre-Laout-Composer>

![Layout Composer editor](docs/img/ui-overview.png)

*The editor with a forest-area map of Aceh laid out following SK MENLHK 399/2024. The layout file is in [`examples/`](examples/kawasan-hutan-aceh-klhk.layout.json); the exported page is shown under [KLHK cartographic rules](#klhk-cartographic-rules).*

---

## Contents

- [Features](#features)
- [Screenshots](#screenshots)
- [Install](#install)
- [Quick start](#quick-start)
- [Architecture](#architecture)
- [Export pipeline](#export-pipeline)
- [Layout data model](#layout-data-model)
- [KLHK cartographic rules](#klhk-cartographic-rules)
- [Keyboard shortcuts](#keyboard-shortcuts)
- [Development](#development)
- [Licenses and third-party notices](#licenses-and-third-party-notices)

---

## Features

| Area | What you get |
|---|---|
| **Page** | Size catalog grouped by type — ISO A0–A6, ISO B0–B5, Letter/Legal/Tabloid/ANSI/Arch, F4, KLHK minimum sizes (SK 399/2024 Table 1), posters, photo prints, presentation (16:9, 4:3, 16:10, 4K) and social media (Instagram post/portrait/story, TikTok/Reels, Facebook, X, LinkedIn, YouTube, Pinterest, WhatsApp). Units mm · cm · in · pt · px (px at a chosen pixels-per-inch), orientation, single/double neatline, margins, canvas grid, ruler guides, smart snapping. |
| **Map frames** | Live MapLibre map per frame, WYSIWYG at print scale, pan/zoom content (double-click), set or lock scale 1:n, rotation, zoom to layer, per-frame basemap (same as GeoLibre, streets, light, bright, satellite, topographic, none), **GeoLibre capture** mode that includes raster/COG layers.; **frame shapes**: rectangle, rounded, circle/ellipse, triangle, diamond, pentagon, hexagon, octagon, star, heart, shield, arch, or **any image as a mask** (PNG/SVG silhouette).; **layers per frame**: each frame shows its own set of GeoLibre layers (e.g. an inset with only the boundary), and linked legends follow. |
| **Coordinate grids** | DMS · DM · DD · UTM (m or km, auto zone), lines/crosses/dots, zebra or inside/outside ticks, labels inside/outside, BT/LS or E/W–N/S. |
| **Inset / key maps** | Extent box, location point or crosshair of another frame. |
| **Legend** | Built from GeoLibre symbology (`match`, `step`, `interpolate`), single-band rasters/COG as colormap ramps, **XYZ / WMS tile layers with a thumbnail of the actual tile**, editable labels/colors/order, manual entries, multi-column, LaTeX labels. |
| **Attribute tables** | Built from a layer's features: **summary by class** (area in ha or km², length in km, count, sum or average of a field, with count and percent columns and a total row) or a **feature list** with chosen columns; filter (`=`, `≠`, `>`, `<`, contains), sort, top N with "Other", decimals and number format (`1,234.56` or `1.234,56`). Area and length are measured on the ellipsoid. Values update when the data changes. |
| **Charts** | Pie, donut (total in the centre), column and bar charts with the same data options; colors from the layer's GeoLibre symbology, a palette or one color; labels as percent, value or class; legend beside the chart; axis ticks that never overlap. |
| **Color bar** | matplotlib-style: 39 colormaps + custom colors, reverse, continuous or classed, horizontal/vertical, **pointed or square extensions** (min/max/both), even/rounded/custom ticks with tick count, decimals, prefix/suffix, LaTeX title, reads min/max/colormap from GeoLibre raster (`rasterState.rescale`) or graduated layers.; **values from a raster**: min/max and colormap (incl. `_r` reversed) read from the layer's stretch or statistics, with round tick values. |
| **Scale bars** | 11 styles incl. **dual units** (km below, paper cm / m / mi / nmi above), numeric 1:n. |
| **North arrows** | 26 styles, follow map rotation, letter U/N. |
| **Canva-style editing** | One click adds any item at the centre of the view (no box to draw); double-click or Enter edits text right on the page; text presets (heading, subheading, body, caption, map label, callout); text effects (shadow, lift, hollow, outline, highlight, neon, echo) and underline/strike/overline; flip horizontal/vertical for every item; image filters (brightness, contrast, saturation, grayscale, sepia, hue, blur + presets Mono, Vivid, Warm, Faded, Dramatic) and masks (circle, hexagon, star, heart, blob). |
| **Text & LaTeX** | Text boxes with variables (`{title}`, `{date}`, `{scale}`…), `$…$` math anywhere (text, legend, color bar title, markers), formula item with 104-symbol catalog, structure templates and recent formulas (MathJax 3, vector output). Quick text bar: font (incl. installed fonts), size, bold, italic, color, alignment, superscript/subscript.; **fonts**: a searchable font picker with every **Google Font** (about 2,000 families, filter by sans, serif, display, script, mono, previewed in their own face) plus the fonts installed on your computer. Google Fonts are embedded in PNG, JPG, PDF and SVG exports.; **typography**: weight 100 to 900 (the weights each Google font really has), size, color and opacity, italic, small caps, underline, strikethrough, case, line height, letter spacing, paragraph gap, padding, left / centre / right / **justified** alignment, vertical alignment, and **auto size** (fixed box, auto height, or auto width). |
| **Drawing** | Polyline, polygon, Bézier pen (click = corner, drag = curve), freehand (simplified + smoothed), arrow line; 33 shapes; fills: solid, gradient, hatch patterns (/ \ × − \| + ·); 6 dash styles. |
| **Symbols** | Point markers with labels (12 symbols); **icon catalog** with Maki (215) and Temaki (557) icons grouped by type (water, terrain, vegetation, transport, public services, health, education, religion, tourism, sports, utilities, hazards…) and **Google Material Symbols (3,912 icons in 17 categories: maps, travel, transit, home, business…)** in outlined, rounded or sharp style, regular or filled. The catalog searches as you type and loads icons in batches, and placed icons are stored in the layout so they work offline. |
| **Effects** | Drop shadow and frosted glass (blurs the map behind; reproduced in exports) on any item. |
| **Editing** | Minimal desktop-style workspace: every tool sits in the top bar (main menu and layout picker on the left; tools, map elements and insert menus in the centre; zoom, save and export on the right), outline icons that follow the light or dark theme, a full-height Layers panel, and an align, distribute and order bar at the top of the properties panel. Item properties grouped into Content, Style, Grid and Arrange tabs (or All); top-bar insert menus (Text, Draw, Shape, Image, Symbols, Scale bar), floating contextual toolbar for text and shapes, map navigation in the map panel (zoom in/out, fit layers, zoom to layer, previous/next extent), Move-content tool, collapsible left/right docks, item search, Figma-style selection (handles, rotation knob, size badge), hover outlines, multi-select, groups, align/distribute, lock/hide, rename, context menu, undo/redo, copy/paste, layers list. Round color wheel with brightness, hex, eyedropper, palette and recent colors. Light theme and soft neutral dark theme that follow GeoLibre.; **precise position and size** in mm, cm, in, pt or px, with a QGIS-style 9-point reference point, lock aspect ratio and ±90° rotation buttons. |
| **Grid design** | Canvas grid with spacing, major lines every N, lines or dots, color and opacity; **layout grid** like Figma (columns and rows with gutters and margin, shown on screen only, items snap to the edges); ruler guides plus guides at an exact position, guide color; adjustable snap distance and arrow-key nudge steps. |
| **Layouts & templates** | Several layouts per project, autosave, save/open `.layout.json`, **save your own templates** and start new layouts from them (maps re-framed on the current GeoLibre view). |
| **QGIS templates** | **Export as `.qpt`**: labels, map frames (extent, rotation, CRS EPSG:3857, DMS/DD/UTM grid with zebra frame), pictures, shapes, scale bars and legends become native QGIS items linked to their map; items QGIS has no equivalent for (color bars, charts, tables, north arrows, LaTeX, icons, drawings) are embedded as SVG pictures, so the page looks the same. **Import `.qpt`** from QGIS 3: page size, labels, maps (extents in EPSG:3857, EPSG:4326, WGS 84 / UTM and DGN95 / UTM), pictures, shapes, scale bars, legends, polylines and polygons. Checked by loading and rendering exported files in QGIS 3.44. |
| **Export** | PNG/JPG (75–600 dpi, page/white/transparent background), raster PDF, **vector PDF**, **GeoPDF** (every map frame georeferenced, WGS 84), SVG.; export settings open in their own window and a progress bar fills from left to right while maps render. |

## Screenshots

| | |
|---|---|
| ![Soft dark theme](docs/img/ui-overview-dark.png) | ![Floating text toolbar](docs/img/ui-text-toolbar.png) |
| **Soft dark theme** | **Floating text toolbar** |
| ![Map frame panel: navigation, scale, basemap, grid](docs/img/ui-map-panel.png) | ![matplotlib-style color bar](docs/img/ui-colorbar.png) |
| **Map frame panel: navigation, scale, basemap, grid** | **matplotlib-style color bar** |
| ![Map frames: circle, hexagon, image mask, triangle; legend with tile and raster layers](docs/img/ui-map-frames.png) | ![Attribute table: summary by class with count, percent and total](docs/img/ui-attribute-table.png) |
| **Map frame shapes, image mask, tile & raster legend** | **Attribute table from a layer** |
| ![Donut, bar and column charts](docs/img/ui-charts.png) | ![Layers per map frame](docs/img/ui-map-layers.png) |
| **Donut, bar and column charts** | **Layers per map frame, legend follows** |
| ![Google Material Symbols in the icon catalog](docs/img/ui-icons-google.png) | ![Font picker with Google Fonts](docs/img/ui-fonts.png) |
| **Google Material Symbols in the icon catalog** | **Font picker with every Google Font** |
| ![Export window with progress and steps](docs/img/ui-export-progress.png) | ![Grid design: canvas grid, layout grid and guides](docs/img/ui-grid-design.png) |
| **Export window: progress from left to right, with steps** | **Grid design: canvas grid, layout grid, guides** |
| ![Precise position and size](docs/img/ui-position.png) | |
| **Precise position and size with reference point and units** | |
| ![LaTeX, dual scale bar, hatch & gradient fills, frosted glass](docs/img/ui-features-dark.png) | ![Shape toolbar](docs/img/ui-shape-toolbar.png) |
| **LaTeX, dual scale bar, hatch & gradient fills, frosted glass** | **Shape toolbar** |
| ![Color wheel](docs/img/ui-color-wheel.png) | ![LaTeX formula and symbol catalog](docs/img/ui-latex.png) |
| **Color wheel** | **LaTeX formula and symbol catalog** |
| ![26 north arrows](docs/img/ui-north-arrows.png) | ![Shape library](docs/img/ui-shapes.png) |
| **26 north arrows** | **Shape library** |
| ![Draw tools](docs/img/ui-draw.png) | ![Scale bar styles](docs/img/ui-scale-bars.png) |
| **Draw tools** | **Scale bar styles** |
| ![Point markers](docs/img/ui-symbols.png) | ![Maki / Temaki icon catalog](docs/img/ui-icon-catalog.png) |
| **Point markers** | **Maki / Temaki icon catalog** |
| ![Page size catalog](docs/img/ui-page-sizes.png) | ![Export: PNG, JPG, PDF, vector PDF, GeoPDF, SVG](docs/img/ui-export.png) |
| **Page size catalog** | **Export: PNG, JPG, PDF, vector PDF, GeoPDF, SVG** |
| ![Context menu](docs/img/ui-context-menu.png) | ![Layouts and user templates](docs/img/ui-templates.png) |
| **Context menu** | **Layouts and user templates** |

## Install

1. Download `geolibre-layout-composer.zip` 
2. GeoLibre Desktop: copy the zip into `%APPDATA%\org.geolibre.desktop\plugins` (Windows) and restart GeoLibre — or install it from **Manage Plugins** in Settings once it is in the registry.
3. Enable **Layout Composer** in the **Plugins** menu, then open it with **Open Layout Composer** in the Layout menu or the layout button at the top right of the map.

## Quick start

1. Pick a **page size** on the *Page* tab (catalog button).
2. Click **Map** in the top bar; the frame appears in the middle of the view. Set the scale in the panel on the right, or double-click the frame to pan its content.
3. Add **Inset, Legend, Color bar, North** and **Text, Data (tables and charts), Draw, Shape, Image, Symbols, Scale bar**, all from the top bar. Each item's settings appear on the right, grouped into Content, Style and Arrange tabs. The left panel lists the layers of the page.
4. Click the **Export** icon at the top right. A window opens with the format (PNG, JPG, PDF, Vector PDF, GeoPDF, SVG), resolution, background and file name; a bar shows the progress from left to right. To continue in QGIS, use **Export as QGIS template (.qpt)** in the main menu.

## Architecture

```mermaid
flowchart LR
  subgraph Host["GeoLibre (host app)"]
    GL[MapLibre map + layers]
    API["Plugin API<br/>getMap · listLayers · getProjectSnapshot<br/>getLayerFeatures · registerToolbarMenu"]
  end
  subgraph Plugin["Layout Composer (one ES module)"]
    Core[Core state<br/>layouts · undo · autosave]
    UI[Editor UI<br/>tool rail · canvas · rulers · panels]
    Items[Item renderers, drawn as SVG in mm<br/>map · legend · color bar · scale · north · text · LaTeX · shapes · paths · markers · icons · tables]
    Maps[Live map frames<br/>copied MapLibre style]
    Cat[Catalogs<br/>Maki · Temaki · Material Symbols · Google Fonts · paper sizes · colormaps]
    Data[Data items<br/>attribute tables · charts<br/>area and length on the ellipsoid]
    Exp[Export<br/>PNG · JPG · PDF · Vector PDF · GeoPDF · SVG]
    QPT[QGIS templates<br/>.qpt import and export]
  end
  GL --> API --> Core
  Core <--> UI
  UI --> Items
  Items --> Maps
  Cat --> UI
  Items --> Exp
  API --> Data --> Items
  Core <--> QPT
  MJ[(MathJax 3)] -.lazy.-> Items
  PDF[(jsPDF + svg2pdf.js)] -.lazy.-> Exp
  ICN[(Maki / Temaki / Material Symbols SVG via jsDelivr)] -.on use.-> Items
  GF[(Google Fonts CSS2 + Fontsource list)] -.on use.-> UI
```

Every item is drawn as an SVG fragment in page millimetres. The same SVG is used on screen and in every export, so the preview matches the output. Map frames additionally host a live MapLibre instance laid out at the frame's 96-dpi size and CSS-scaled to the canvas zoom, so labels and line widths keep their printed proportions.

## Export pipeline

```mermaid
sequenceDiagram
  participant U as User
  participant E as Export menu
  participant M as Map frames
  participant S as Page SVG
  participant O as Output
  U->>E: format, dpi, background, file name
  E->>M: render each live frame off-screen (pixelRatio = dpi/96)
  M-->>E: PNG data URLs
  E->>S: compose page (decor + items + effects + map images)
  alt PNG / JPG / PDF / GeoPDF
    S->>O: rasterize at dpi (canvas)
    O->>O: PDF via jsPDF · GeoPDF adds /VP /Measure /GEO per frame
  else Vector PDF
    S->>O: svg2pdf.js (text, lines, symbols stay vector)
  else SVG
    S->>O: download SVG (maps embedded at 200 dpi)
  end
```

## QGIS template exchange

```mermaid
flowchart LR
  subgraph LC["Layout Composer item"]
    T[text]
    M[map frame + grid]
    P[image]
    SH[rect · ellipse · triangle]
    SB[scale bar]
    LG[legend]
    O[color bar · chart · table · north arrow · LaTeX · icon · drawing]
  end
  subgraph Q["QGIS 3 layout item"]
    QL[QgsLayoutItemLabel]
    QM[QgsLayoutItemMap<br/>EPSG:3857 extent + map grid]
    QP[QgsLayoutItemPicture]
    QS[QgsLayoutItemShape]
    QB[QgsLayoutItemScaleBar]
    QG[QgsLayoutItemLegend]
  end
  T <--> QL
  M <--> QM
  P <--> QP
  SH <--> QS
  SB <--> QB
  LG <--> QG
  O -- embedded SVG picture --> QP
```

Scale bars and legends are linked to their map through `templateUuid`, as QGIS expects in templates. Embedded SVG pictures are rewritten for QtSvg, the SVG engine QGIS uses (no nested `<svg>`, no `dominant-baseline`, one `<text>` per line).

## Layout data model

```mermaid
classDiagram
  class Library { active; layouts }
  class Layout { id; name; page; items[]; vars }
  class Page { size; unit; width_mm; height_mm; orientation; border; margin; grid; guides }
  class Item { id; type; name; x; y; w; h; rot; opacity; locked; hidden; group; fx; props }
  class MapProps { source live|snapshot; view center zoom bearing; scaleLock; basemap; hiddenLayers; frameShape; grid; overview }
  class DataProps { layer; group; valueMode; valueField; filter; sort; topN; decimals; locale }
  class Effects { shadow; glass }
  Library "1" --> "*" Layout
  Layout "1" --> "1" Page
  Layout "1" --> "*" Item
  Item --> Effects
  Item <|-- MapProps
  Item <|-- DataProps
```

## KLHK cartographic rules

The example layout follows **Keputusan Menteri LHK No. 399 Tahun 2024** (Spesifikasi Penyajian IGT LHK):

| Element | Rule (SK 399/2024) | In Layout Composer |
|---|---|---|
| Layout | Map face left, margin information right | Example layout |
| Grid | DMS, lines R190 G232 B255 or black "+" marks; ≥ 2 lat and 2 lon labels | Grid style DMS, color #BEE8FF, Arial labels |
| Fonts | Arial, black; title Arial Bold capitals centered; notes Arial Italic in a box | Text items + quick text bar |
| Scale | Numeric and bar; key map numeric only | Scale bar + `Scale {scale}` text |
| North arrow | Arrow pointing up with "U" | North arrow, letter U |
| Projection note | System, coordinates, datum (WGS 1984/SRGI) | Text block |
| Forest functions | KSA/KPA 173 63 255 · HL 2 173 0 · HPT 138 242 0 · HP 255 255 0 · HPK 255 94 255 · APL 255 255 255 | Layer colors in the example; legend built automatically |
| Paper size | Minimum sizes per scale (Table 1) | Indonesia group in the page size catalog |

For official topographic (Rupabumi) symbology follow **SNI 8743:2019**.

![KLHK forest-area map exported from Layout Composer](docs/img/klhk-kawasan-hutan-aceh.png)

## Keyboard shortcuts

| Keys | Action |
|---|---|
| `V` / `H` / `C` | Select / pan canvas (or hold `Space`) / move map content |
| Shift + 1 / Shift + 2 | Fit page / zoom to selection |
| Ctrl + scroll, Ctrl + `+` / `−` / `0` | Zoom canvas / fit page |
| Arrows (Shift ×10, Alt ×0.1) | Nudge 1 mm |
| Ctrl + Z / Y | Undo / redo |
| Ctrl + C / V / D | Copy / paste / duplicate |
| Ctrl + G, Ctrl + Shift + G | Group / ungroup |
| Delete | Delete |
| Double-click map | Pan/zoom map content (Esc to finish) |
| Pen: Enter, double-click, Backspace, Esc | Finish, finish, remove point, cancel |
| Alt while dragging · Shift while dragging | No snapping · lock direction / proportions / 15° rotation |

## Development

```text
src/            sources, concatenated in order into plugin/index.js
  01-core.js        state, history, storage, variables
  02-symbols.js     north arrows, shapes, scale bar styles
  03-geo.js         Web Mercator, UTM, grids
  04-items.js       item types and SVG renderers
  04b-colorbar.js   matplotlib-style color bar + colormaps
  04c-latex.js      MathJax formulas, symbol catalog
  04d…04h           fills/paths, dual scale bar, effects/markers, icon catalog data/UI (04g2: Material Symbols)
  04i-data.js       attribute tables and charts (aggregation, ellipsoidal area and length)
  05-maps.js        MapLibre frames, legend from styles, capture
  06-ui.js, 06b, 06c   editor shell, interactions, draw tools, templates
  06d, 06e          Canva-style adding and inline editing; Google Fonts and the font picker
  07-props.js, 07b, 07c  property panels, color wheel + quick text bar, page sizes
  07d-dataprops.js  panels for tables, charts and layers per map frame
  08-export.js      PNG/JPG/PDF/vector PDF/GeoPDF/SVG
  08b-qpt.js        QGIS .qpt template import and export
  09-plugin.js      GeoLibre plugin entry
plugin/         plugin.json, index.js (built), style.css
tools/          build_catalog.py (groups Maki/Temaki icons by type), build_material.py (Material Symbols by category), screenshots.py (README images)
test/           index.html and klhk.html harnesses (MapLibre + mock GeoLibre API)
examples/       sample layouts
```

```bash
sh build.sh
```

Builds `plugin/index.js` and `geolibre-layout-composer.zip`. To test without GeoLibre, serve the folder (`python -m http.server`) and open `test/index.html`.

## Licenses and third-party notices

**This plugin:** MIT License © 2026 Defani Arman Alfitriansyah — see [LICENSE](LICENSE).

| Component | Used for | Source | License |
|---|---|---|---|
| MapLibre GL JS | Map rendering (provided by the GeoLibre host, not bundled) | [maplibre.org](https://maplibre.org) | BSD-3-Clause |
| MathJax 3.2.2 | Renders LaTeX as SVG (loaded on first use) | [mathjax.org](https://www.mathjax.org), jsDelivr | Apache-2.0 |
| jsPDF 2.5.1 | PDF / GeoPDF output (loaded on export) | [github.com/parallax/jsPDF](https://github.com/parallax/jsPDF), cdnjs | MIT |
| svg2pdf.js 2.2.4 | Vector PDF (loaded on export) | [github.com/yWorks/svg2pdf.js](https://github.com/yWorks/svg2pdf.js), jsDelivr | MIT |
| Maki 8.2.0 icons | Icon catalog | [github.com/mapbox/maki](https://github.com/mapbox/maki) | CC0-1.0 |
| Temaki 5.13.0 icons | Icon catalog | [github.com/rapideditor/temaki](https://github.com/rapideditor/temaki) | CC0-1.0 |
| Material Symbols (@material-symbols/svg-400 0.47.4) | Icon catalog, Google tab (loaded from jsDelivr on use) | [fonts.google.com/icons](https://fonts.google.com/icons), [github.com/google/material-design-icons](https://github.com/google/material-design-icons) | Apache-2.0 |
| Google Fonts | Fonts (loaded from fonts.googleapis.com on use; embedded in exports) | [fonts.google.com](https://fonts.google.com); family list from the [Fontsource API](https://fontsource.org) | Each family's own open license (SIL OFL 1.1, Apache-2.0 or UFL) |
| UI icons, north arrows, shapes, scale bars, markers | Editor and layout items | Original inline SVG drawn for this project | MIT (this project) |
| GeoPDF writer | ISO 32000 `/VP /Measure /GEO` | Ported from GIS Consultant Studio (same author) | MIT |
| Viridis, Plasma, Inferno, Magma, Cividis | Colormaps | Matplotlib (van der Walt & Smith; Nuñez et al.) | CC0 |
| Turbo | Colormap | Google AI (Anton Mikhailov) | Apache-2.0 |
| Spectral, RdYlGn, RdYlBu, RdBu, BrBG, YlGn, YlOrRd, Blues, Greens, Oranges, Reds, Purples, Greys | Colormaps | ColorBrewer — Cynthia Brewer | Apache-2.0 |
| Coolwarm, Jet, Terrain, Gray | Colormaps | Matplotlib (Coolwarm: K. Moreland) | Matplotlib license (BSD-style) |
| KLHK cartographic rules and forest-function colors | Example layout | Keputusan Menteri LHK No. 399/2024 (public regulation) | Public regulation |
| Basemap styles in map frames | Optional per-frame basemaps | OpenFreeMap styles; data © OpenStreetMap contributors | Styles BSD-3-Clause / data ODbL-1.0 |
| Satellite / topographic raster basemaps | Optional per-frame basemaps | Esri World Imagery / World Topo Map tile services | Esri terms of use — attribute the provider when publishing |
| Installed fonts | Text | System fonts and fonts installed on your computer (none bundled) | Their own licenses |

Map content you add (GeoLibre layers, logos, data) keeps its own license; credit your data sources in the layout.
