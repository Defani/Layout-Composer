# Changelog

## 1.11.0 — 2026-10-22

A Word-style workspace with far more room for the page, many new items and a long list of fixes.

### Registry build (2026-10-29)
- The release zip on the GeoLibre plugin registry is the **registry build** (`python tools/build.py --general --release`): the full Layout View, without the Map Tools on GeoLibre's map (ribbon dock, Map Tools menu and tab, Category Colors) and without Ask AI / the Live MCP Bridge API (`window.LayoutComposer.ai`).
- It opens as in 1.8.2: a **Layout** menu and a button among the map controls, so GeoLibre's own icons keep their places. The tour skips the Map Tools step.
- Catalog screenshots: the 1.11 Insert ribbon and the Kuningan example map as JPEG (the registry limit is 1 MiB per image).
- The full build (`python tools/build.py`) is unchanged.

### Guided tour for new users
- **Layout View tour** (12 steps) on first use: a spotlight with a dimmed screen walks through Insert, adding a map frame, Format, the page and handles, Select / Hand, Layers, Map Tools, zoom, page settings, export and saving. Back / Next / Skip, ← → Enter and Esc.
- **Map Tools tour** (4 steps) for the ribbon over the map on first use.
- Replay any time: **?** in the top bar, *Take the tour* in the main menu and in the Layout Composer menu; plus a **Keyboard shortcuts** sheet in the main menu.

### Map Series (atlas)
- One layout, **one page per feature of an index layer** (e.g. every district): the chosen map frame zooms to each feature (best fit with a margin, optionally to a round scale) or keeps its scale and centres on it.
- Text variables `{series_name}`, `{series_page}`, `{series_count}` and `{series:FIELD}` (any column of the index layer).
- Page navigation in the Map Frame tab and the status bar (◀ name · 3/32 ▶, Page Up / Page Down).
- **Export Series**: one multi-page PDF, or one PNG / JPG per page (on the desktop app, pick the folder once).

### Category Colors (layer symbology)
- Colour a GeoLibre layer by the classes of a field, read from its own data: **Distinct 200** (200 non-gradient colours, neighbours always far apart), **KLHK** official class colours (SK 399/2024 classes and forest-area codes matched by name), Plotly, Tableau 10 and ColorBrewer Set1 / Set2 / Set3 / Paired / Dark2 / Pastel1.
- Opacity 100 % by default, outline colour and width, a colour for other values, shuffle, and any class colour changed by hand; applied through GeoLibre's *Import style* (saved with the project) and followed by the layout legends.

### Map Tools (Data View)
A **Map Tools ribbon docked across the top of the map** (tabs Map · Create · Edit · Share, large buttons in captioned groups, collapsible, shown / hidden from the Layout Composer menu), the same tools as a **Map Tools** tab in the composer and a **Map Tools** submenu of the Layout Composer menu, with the workflows of *ArcGIS Pro Map Fundamentals*:
- **Coordinates**: DD, DMS, DDM, UTM and MGRS everywhere — typed or pasted in any of them (also `LS/BT`); a conversion window; settings for the default format, MGRS precision and the copied text template; **right-click on the map copies the coordinate**; optional cursor readout.
- **Navigate**: go to a coordinate (with a marker), zoom to a scale, zoom to a layer.
- **Create features**: points, lines / polylines (optionally geodesic) and polygons from coordinate lists; import points from CSV / TSV or rows pasted from a spreadsheet (X/Y, one coordinate column, or UTM columns; other columns kept as attributes); import lines / polygons from WKT, GeoJSON or plain lists — into a new layer or **added to an existing layer**.
- **Edit**: move selected features by distance and bearing or to a coordinate; delete selected features.
- **Map chips** around a point or from a selected polygon, saved as PNG with a `.pgw` world file (EPSG:3857).
- **Imagery**: footprints of raster / image layers as a map-catalog layer, and the images covering a point.

### Workspace
- **Ribbon with tabs like Microsoft Word.** *Insert* holds every element (Map, Inset, Legend, Color bar, North, Scale bar, Text, LaTeX, Table, Symbol, HTML, Mermaid, Data, Draw, Shape, Image, Symbols) as large buttons in captioned groups. *Format* shows the settings of the selection in two-row groups with a caption under each, with no scrollbar. Selecting an item switches to *Format*.
- **Contextual tabs**: *Table Design* and *Table Layout* for tables, *Map Frame* and *Grid* for map frames.
- **Every Format tab runs to the end of the bar**: groups made for each item type (text box and character, legend, symbols and fonts, scale bar and labels, north arrow style, letter, font and presets, color bar colors / values / bar, formula templates, marker symbol and label, icon, shape pattern and gradient, picture adjustments, HTML and diagram templates) plus, on every item, **Position & Size** (X, Y, W, H, rotation), **Effects** (opacity, shadow, glass), **Arrange** (order, flip), **Align to Page** and **Item** (duplicate, lock, delete, all properties). Several selected items get Align, Distribute, Size, Arrange and Group.
- **More room for the page**: no side rail; Select / Hand sit in the top bar; *Layers* is a drop-down list floating over the canvas (drag rows to reorder); the property panel and Ask AI are closed until opened; slimmer bars.
- Portrait / Landscape / Border, canvas grid, guides, snap and the new **Selection** frame options (color, solid / dashed / dotted, width) sit in the status bar.
- The zoom slider was removed; zoom with the buttons, `Ctrl` `+` `−` `0` `1`, the numpad or the wheel.
- In GeoLibre the plugin adds **one menu, like a native one, headed by the Layout Composer icon**: Open Layout Composer, Back to the Map, the Map Tools submenu, the Map Tools ribbon and the tour, every entry with its own icon (no button on the map).

### Text
- **Format tab like Word / Google Docs**: font, size list, grow / shrink, change case (Sentence, lower, UPPER, Capitalize, tOGGLE), clear formatting, bold, italic, six underline styles, strikethrough, sub / superscript, text effects, highlight colors, font color; bullets (12 symbols) and numbering (1. 1) (1) a. a) A. A) i. i) I. 1.1) with a hanging indent, indent, sort A–Z / Z–A, alignment incl. justify, line and paragraph spacing, shading and borders; a quick **Styles** gallery (Normal, No Spacing, Title, Subtitle, Heading 1–3, Caption, Quote, Map Title, Source note).
- New text boxes **hug their text** (height follows the lines). Side handles change the width only; top / bottom free the frame.
- **Typing works like Canva**: the box, its frame and handles follow every key — a heading box grows from its left edge, centre or right edge with the alignment, a paragraph box keeps its width, wraps and grows downwards. Dragging a side handle sets the line length and the text wraps to it.
- A **mini toolbar** floats above the selected item: lock, duplicate, delete and more.
- Spaces at the end of a line no longer push centred or right-aligned lines sideways.
- **Symbol dialog** like Word: 28 Unicode subsets (thousands of characters, including a *Map & GIS* set), symbol fonts, character code, recently used symbols and a *Special Characters* tab.

### Items
- **Plotly charts** (bundled Plotly.js): 21 kinds — donut, pie, column, bar, line, area, dots, lollipop, bubble, funnel, funnel area, treemap, sunburst, icicle, rose, radar, waterfall, histogram, box, violin, heat strip — with Plotly, White, Minimal, Seaborn, ggplot2 and Dark styles; data from a GeoLibre layer (count, area, length, sum, average per class, with the layer's class colors) or typed rows. Earlier charts keep their classic look until switched.
- **Mermaid diagrams** (bundled Mermaid): flowchart, sequence, Gantt, pie, mind map, timeline, class, state and more, with templates and themes.
- **HTML blocks**: your own HTML and CSS (scripts, event handlers and outside files removed; CSS kept inside the box); exported as plain SVG.
- **Tables like Word**: style options (header / total row, first / last column, banded rows / columns), 8 table styles, border style / width / pen color / which borders, shading; a cell editor to insert or delete rows and columns at the chosen cell; AutoFit, distribute columns, 3×3 alignment, cell margins.
- **Pictures**: insert from a file or **from a link**; **Remove background** with remove.bg (your own API key); fit / fill / stretch, opacity, border.
- **Scale bar like KLHK maps**: paper centimetres on top, kilometres below, every 0 aligned on the left, equal segments by default with an optional split first segment.
- **North arrows**: use your own PNG / SVG (kept in a reusable library) and set the size of the letter.
- **Map frames**: a mini catalog of every keyless GeoLibre basemap; new frames come with their coordinate grid; grid interval in degrees / minutes / seconds columns or metres for a measured (UTM) grid.
- **Color bars** follow the source raster's range and colormap automatically.

### Editing
- Drawing an item works like Canva / Figma: a live box with its size while dragging, Shift keeps the proportions, Alt draws from the centre, Esc cancels, a plain click drops a default-size item centred on the click.
- Corners resize in proportion (text scales its lettering); sides change one dimension only.
- The **Hand** tool moves the content of a map frame (wheel zooms it, right-drag rotates); outside a frame it pans the page.
- Layers and legend blocks are reordered by dragging with the pointer (works in the desktop app); legend group headings move their whole block, and the order survives *Sync*.
- On the desktop app, saving and exporting open a **Save as** dialog to pick the folder; the web build downloads as before.

### Documentation
- A **User Guide** (`docs/GUIDE.md`) with screenshots of every menu, ribbon tab and dialog, and a step-by-step tutorial; `tools/guide_shots.py` recaptures them.

### Fixes
- With a map frame selected, the Map Tools tab showed the Map Frame tools.
- The right-click menu showed "nullnull" lines.
- The drag-to-draw box was wiped on every mouse move, so items appeared without a preview.
- Grid and labels drew at the wrong size after the zoom changed (the wrong SVG was updated inside map frames).
- Double outlines on selected items (hover line next to the selection frame; auto-sized text out of step with its frame).
- Drop-downs on the ribbon showed a zigzag pattern and clipped their text; ribbon buttons overlapped.
- A drag or draw could stay stuck to the pointer after the window lost focus.
- Exporting a page with an HTML block failed (tainted canvas).
- Double-clicking an empty part of the page did not add a text box in the desktop app.
- Esc while typing in a text box threw an error; it now leaves the box keeping the text.
- While typing, the text sat at the top of the box and jumped to the middle afterwards, and the selection handles and size label covered it; each edit also widened the box a little.
- The Underline and Strikethrough buttons in the side panel had no effect.
- Map frames followed GeoLibre's globe view (a ball under a flat grid); frames are now always flat Web Mercator.
- The scale field in the side panel cut off long scales.

## 1.10.1 — 2026-10-21
- Map frame neatline drawn above the live map in the frame's color and width; `mapFrame` commands for hosts.
