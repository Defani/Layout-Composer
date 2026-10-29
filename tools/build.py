"""Build the plugin: one self-contained, minified ES module plus minified CSS.

* src/*.js are concatenated in order.
* The third-party libraries in vendor/ (jsPDF, svg2pdf.js, MathJax) are embedded
  as strings and started from a Blob URL when first needed, so the plugin never
  loads code from another host at runtime.
* esbuild minifies the result (set ESBUILD to its path, or have it on PATH).
* The plugin folder is zipped as layout-composer.zip, and with --release also as
  dist/layout-composer-<version>.zip with README screenshots, plus its SHA-256.

Usage: python tools/build.py [--release]
"""
import hashlib, json, os, shutil, subprocess, sys, zipfile

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SRC, PLUGIN, VENDOR = (os.path.join(ROOT, d) for d in ("src", "plugin", "vendor"))
GENERAL_EXCLUDE = {"06f-ai-chat.js", "06g-ai-extras.js", "10-maptools.js", "10b-palette.js"}
VENDOR_FILES = {"jspdf": "jspdf.umd.min.js", "svg2pdf": "svg2pdf.umd.min.js", "mathjax": "tex-svg.js", "mermaid": "mermaid.min.js", "plotly": "plotly.min.js"}
SCREENSHOTS = [
    # the registry serves each screenshot only up to 1 MiB
    ("docs/img/ui-overview-1.11.jpg", "screenshots/overview.jpg"),
    ("docs/img/kelerengan-kuningan.jpg", "screenshots/example-map.jpg"),
    ("docs/img/ui-attribute-table.png", "screenshots/data.png"),
    ("docs/img/ui-map-frames.png", "screenshots/map-frames.png"),
]


def esbuild():
    local = os.path.join(ROOT, "tools", "bin", "esbuild.exe" if os.name == "nt" else "esbuild")
    exe = os.environ.get("ESBUILD") or (local if os.path.exists(local) else None) or shutil.which("esbuild")
    if not exe:
        sys.exit("esbuild not found: set ESBUILD=/path/to/esbuild or put it on PATH")
    return exe


def run(*args):
    subprocess.run(args, check=True)


def main():
    release = "--release" in sys.argv
    # --general: the registry build, without Ask AI / the Live MCP Bridge API and
    # without the Map Tools on GeoLibre's map (launcher button + "Layout" menu).
    general = "--general" in sys.argv
    out_dir = os.path.join(ROOT, "build", "general") if general else PLUGIN
    os.makedirs(out_dir, exist_ok=True)
    # optional libraries (e.g. Mermaid) are bundled only when present in vendor/
    vendor = {k: open(os.path.join(VENDOR, f), encoding="utf8").read() for k, f in VENDOR_FILES.items() if os.path.exists(os.path.join(VENDOR, f))}
    parts = ["// Third-party libraries (see README, Licenses): started from a Blob URL on first use.\n",
             "const VENDOR_SRC = " + json.dumps(vendor, ensure_ascii=True) + ";\n"]
    sources = [os.path.join(SRC, n) for n in os.listdir(SRC) if n.endswith(".js") and not (general and n in GENERAL_EXCLUDE)]
    if general:
        sources += [os.path.join(ROOT, "src-general", n) for n in os.listdir(os.path.join(ROOT, "src-general")) if n.endswith(".js")]
    for path in sorted(sources, key=os.path.basename):
        parts.append(open(path, encoding="utf8").read())
    full = os.path.join(ROOT, "build", "index.general.js" if general else "index.full.js")
    open(full, "w", encoding="utf8", newline="\n").write("\n".join(parts))
    exe = esbuild()
    # LC_GENERAL is a compile-time constant, so esbuild drops the other build's branches
    run(exe, full, "--minify", "--format=esm", "--target=es2020", "--legal-comments=none", f"--define:LC_GENERAL={'true' if general else 'false'}", f"--outfile={os.path.join(out_dir, 'index.js')}", "--log-level=warning")
    run(exe, os.path.join(SRC, "style.css"), "--minify", f"--outfile={os.path.join(out_dir, 'style.css')}", "--log-level=warning")
    manifest = json.load(open(os.path.join(PLUGIN, "plugin.json"), encoding="utf8"))
    if general:
        # the manifest version follows PLUGIN_VERSION in src/01-core.js
        core = open(os.path.join(SRC, "01-core.js"), encoding="utf8").read()
        manifest["version"] = core.split('PLUGIN_VERSION = "', 1)[1].split('"', 1)[0]
        open(os.path.join(out_dir, "plugin.json"), "w", encoding="utf8", newline="\n").write(json.dumps(manifest, indent=2, ensure_ascii=False) + "\n")
        for f in ("LICENSE", "NOTICE.md"):
            shutil.copyfile(os.path.join(PLUGIN, f), os.path.join(out_dir, f))
    base = os.path.relpath(out_dir, ROOT)
    files = [(os.path.join(base, f), f) for f in ("plugin.json", "index.js", "style.css", "LICENSE", "NOTICE.md")]

    def write_zip(path, extra=()):
        with zipfile.ZipFile(path, "w", zipfile.ZIP_DEFLATED) as z:
            for src, dst in [*files, *extra]:
                info = zipfile.ZipInfo(dst, date_time=(2026, 1, 1, 0, 0, 0))
                info.compress_type = zipfile.ZIP_DEFLATED
                z.writestr(info, open(os.path.join(ROOT, src), "rb").read())

    zip_name = "layout-composer-general.zip" if general else "layout-composer.zip"
    write_zip(os.path.join(ROOT, zip_name))
    size = os.path.getsize(os.path.join(out_dir, "index.js"))
    print(f"built {base}/index.js ({size / 1024:.0f} KiB, minified) and {zip_name}, version {manifest['version']}")
    if release:
        os.makedirs(os.path.join(ROOT, "dist"), exist_ok=True)
        out = os.path.join(ROOT, "dist", f"layout-composer-{manifest['version']}.zip")
        write_zip(out, SCREENSHOTS)
        digest = hashlib.sha256(open(out, "rb").read()).hexdigest()
        open(out + ".sha256", "w").write(f"{digest}  {os.path.basename(out)}\n")
        print(f"release {os.path.relpath(out, ROOT)}\nsha256  {digest}")


main()
