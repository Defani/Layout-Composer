"""Capture README screenshots of the Layout Composer test pages with headless Chrome.

Usage: serve the repository on http://localhost:8791 (python -m http.server 8791),
then run `python tools/screenshots.py`. Images are written to docs/img/.
"""
import base64, json, os, subprocess, sys, tempfile, time, urllib.request
import websocket  # pip install websocket-client

CHROME = os.environ.get("CHROME", r"C:\Program Files\Google\Chrome\Application\chrome.exe")
BASE = os.environ.get("BASE", "http://localhost:8791/test/")
OUT = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "docs", "img")
SHOTS = [
    ("klhk.html", "overview", "ui-overview.png"),
    ("klhk.html", "overview-dark", "ui-overview-dark.png"),
    ("klhk.html", "text", "ui-text-toolbar.png"),
    ("klhk.html", "map", "ui-map-panel.png"),
    ("index.html", "colorbar", "ui-colorbar.png"),
    ("index.html", "frames", "ui-map-frames.png"),
    ("index.html", "data", "ui-attribute-table.png"),
    ("index.html", "chart", "ui-charts.png"),
    ("index.html", "layers", "ui-map-layers.png"),
    ("index.html", "shape", "ui-shape-toolbar.png"),
    ("index.html", "wheel", "ui-color-wheel.png"),
    ("index.html", "latex", "ui-latex.png"),
    ("index.html", "north", "ui-north-arrows.png"),
    ("index.html", "shapes", "ui-shapes.png"),
    ("index.html", "draw", "ui-draw.png"),
    ("index.html", "scalebars", "ui-scale-bars.png"),
    ("index.html", "symbols", "ui-symbols.png"),
    ("index.html", "icons", "ui-icon-catalog.png"),
    ("index.html", "icons-google", "ui-icons-google.png"),
    ("index.html", "fonts", "ui-fonts.png"),
    ("index.html", "paper", "ui-page-sizes.png"),
    ("index.html", "export", "ui-export.png"),
    ("klhk.html", "progress", "ui-export-progress.png"),
    ("index.html", "position", "ui-position.png"),
    ("index.html", "grid", "ui-grid-design.png"),
    ("index.html", "context", "ui-context-menu.png"),
    ("index.html", "templates", "ui-templates.png"),
    ("index.html", "features-dark", "ui-features-dark.png"),
]

def main():
    port = 9333
    prof = tempfile.mkdtemp(prefix="glc-shots-")
    proc = subprocess.Popen([CHROME, "--headless=new", f"--remote-debugging-port={port}", f"--user-data-dir={prof}", "--use-angle=swiftshader", "--enable-unsafe-swiftshader", "--hide-scrollbars", "--window-size=1600,900", "--remote-allow-origins=*", "about:blank"])
    try:
        for _ in range(50):
            try:
                tabs = json.load(urllib.request.urlopen(f"http://127.0.0.1:{port}/json"))
                break
            except Exception:
                time.sleep(0.3)
        page = next(t for t in tabs if t["type"] == "page")
        ws = websocket.create_connection(page["webSocketDebuggerUrl"], timeout=120, suppress_origin=True)
        mid = [0]
        def call(method, **params):
            mid[0] += 1
            ws.send(json.dumps({"id": mid[0], "method": method, "params": params}))
            while True:
                msg = json.loads(ws.recv())
                if msg.get("id") == mid[0]:
                    return msg.get("result", {})
        call("Emulation.setDeviceMetricsOverride", width=1600, height=900, deviceScaleFactor=1, mobile=False)
        for pagefile, shot, name in SHOTS:
            call("Page.navigate", url=f"{BASE}{pagefile}?shot={shot}")
            t0 = time.time()
            while time.time() - t0 < 60:
                r = call("Runtime.evaluate", expression="document.title", returnByValue=True)
                if r.get("result", {}).get("value") == "READY":
                    break
                time.sleep(0.5)
            time.sleep(4)  # let map tiles settle
            img = call("Page.captureScreenshot", format="png")
            open(os.path.join(OUT, name), "wb").write(base64.b64decode(img["data"]))
            print("saved", name)
        ws.close()
    finally:
        proc.terminate()

if __name__ == "__main__":
    sys.exit(main())
