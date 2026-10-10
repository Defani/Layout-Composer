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
VENDOR_FILES = {"jspdf": "jspdf.umd.min.js", "svg2pdf": "svg2pdf.umd.min.js", "mathjax": "tex-svg.js"}
SCREENSHOTS = [
    ("docs/img/ui-overview.png", "screenshots/overview.png"),
    ("docs/img/kawasan-hutan-aceh.png", "screenshots/klhk-map.png"),
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
    os.makedirs(os.path.join(ROOT, "build"), exist_ok=True)
    vendor = {k: open(os.path.join(VENDOR, f), encoding="utf8").read() for k, f in VENDOR_FILES.items()}
    parts = ["// Third-party libraries (see README, Licenses): started from a Blob URL on first use.\n",
             "const VENDOR_SRC = " + json.dumps(vendor, ensure_ascii=True) + ";\n"]
    for name in sorted(os.listdir(SRC)):
        if name.endswith(".js"):
            parts.append(open(os.path.join(SRC, name), encoding="utf8").read())
    full = os.path.join(ROOT, "build", "index.full.js")
    open(full, "w", encoding="utf8", newline="\n").write("\n".join(parts))
    exe = esbuild()
    run(exe, full, "--minify", "--format=esm", "--target=es2020", "--legal-comments=none", f"--outfile={os.path.join(PLUGIN, 'index.js')}", "--log-level=warning")
    run(exe, os.path.join(SRC, "style.css"), "--minify", f"--outfile={os.path.join(PLUGIN, 'style.css')}", "--log-level=warning")
    manifest = json.load(open(os.path.join(PLUGIN, "plugin.json"), encoding="utf8"))
    files = [(os.path.join("plugin", f), f) for f in ("plugin.json", "index.js", "style.css", "LICENSE", "NOTICE.md")]

    def write_zip(path, extra=()):
        with zipfile.ZipFile(path, "w", zipfile.ZIP_DEFLATED) as z:
            for src, dst in [*files, *extra]:
                info = zipfile.ZipInfo(dst, date_time=(2026, 1, 1, 0, 0, 0))
                info.compress_type = zipfile.ZIP_DEFLATED
                z.writestr(info, open(os.path.join(ROOT, src), "rb").read())

    write_zip(os.path.join(ROOT, "layout-composer.zip"))
    size = os.path.getsize(os.path.join(PLUGIN, "index.js"))
    print(f"built plugin/index.js ({size / 1024:.0f} KiB, minified) and layout-composer.zip, version {manifest['version']}")
    if release:
        os.makedirs(os.path.join(ROOT, "dist"), exist_ok=True)
        out = os.path.join(ROOT, "dist", f"layout-composer-{manifest['version']}.zip")
        write_zip(out, SCREENSHOTS)
        digest = hashlib.sha256(open(out, "rb").read()).hexdigest()
        open(out + ".sha256", "w").write(f"{digest}  {os.path.basename(out)}\n")
        print(f"release {os.path.relpath(out, ROOT)}\nsha256  {digest}")


main()
