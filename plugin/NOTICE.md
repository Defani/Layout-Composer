# Third-party notices

Layout Composer (MIT, (c) 2026 Defani Arman Alfitriansyah) embeds these libraries unchanged in `index.js`.
They are started from a Blob URL the first time they are needed; nothing is downloaded from another host.

| Library | Version | License | Source |
|---|---|---|---|
| jsPDF | 2.5.1 | MIT, (c) 2010-2021 James Hall, yWorks GmbH and contributors | https://github.com/parallax/jsPDF |
| svg2pdf.js | 2.2.4 | MIT, (c) yWorks GmbH | https://github.com/yWorks/svg2pdf.js |
| MathJax | 3.2.2 | Apache-2.0, (c) The MathJax Consortium | https://github.com/mathjax/MathJax |
| Mermaid | 11.4.1 | MIT, (c) 2014-2024 Knut Sveidqvist and contributors | https://github.com/mermaid-js/mermaid |
| Plotly.js (plotly.js-dist-min) | 2.35.2 | MIT, (c) 2012-2024 Plotly, Inc. | https://github.com/plotly/plotly.js |

Optional online services, used only when the user asks: **Remove background** sends the selected picture to
remove.bg (api.remove.bg) with the user's own API key, stored in this browser only; **Picture from a link**
downloads the picture from the address the user pastes and stores it in the layout.

Icons and fonts are not bundled: Maki and Temaki (CC0) and Material Symbols (Apache-2.0) SVGs are fetched from
jsDelivr when placed, and Google Fonts (each family's open license) from fonts.googleapis.com when chosen.
