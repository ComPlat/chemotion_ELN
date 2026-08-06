"""Tiny HTTP wrapper around the snurr-group `mofid` package.

Accepts a CIF file and returns the computed MOFid / MOFkey (and the
intermediate SMILES / topology data), mirroring the Snurr group's
web-mofid tool but running server-side so Chemotion can call it over HTTP
the same way it already calls the Indigo service.
"""

import os
import re
import shutil
import tempfile

from flask import Flask, jsonify, request

from mofid.run_mofid import cif2mofid

app = Flask(__name__)

# CIF payloads are small; cap the request body to a sane size.
app.config["MAX_CONTENT_LENGTH"] = 16 * 1024 * 1024  # 16 MB

RESULT_KEYS = (
    "mofid",
    "mofkey",
    "smiles",
    "smiles_nodes",
    "smiles_linkers",
    "topology",
    "cat",
)

# The CCDC deposition number is a standard CIF tag but is not surfaced by the
# MOFid pipeline, so pull it out of the CIF text ourselves. Handles e.g.
#   _database_code_depnum_ccdc_archive 'CCDC 755080'
# and returns just the code ("755080").
_CCDC_RE = re.compile(
    r"_database_code_depnum_ccdc_archive\s+['\"]?\s*(?:CCDC\s+)?([A-Za-z0-9-]+)",
    re.IGNORECASE,
)


def _extract_ccdc(cif_text):
    """Return the CCDC deposition number from a CIF, or '' when absent."""
    match = _CCDC_RE.search(cif_text or "")
    return match.group(1) if match else ""


@app.route("/health", methods=["GET"])
def health():
    return jsonify(status="ok")


def _extract_cif():
    """Read CIF text from JSON body, a multipart file, or the raw body."""
    if request.is_json:
        cif = (request.get_json(silent=True) or {}).get("cif")
        if cif:
            return cif
    if "file" in request.files:
        return request.files["file"].read().decode("utf-8", "replace")
    if request.data:
        return request.data.decode("utf-8", "replace")
    return None


@app.route("/analyze", methods=["POST"])
def analyze():
    cif_text = _extract_cif()
    if not cif_text or not cif_text.strip():
        return jsonify(error="No CIF provided"), 400

    workdir = tempfile.mkdtemp(prefix="mofid_")
    try:
        cif_path = os.path.join(workdir, "input.cif")
        with open(cif_path, "w", encoding="utf-8") as handle:
            handle.write(cif_text)

        result = cif2mofid(cif_path, output_path=os.path.join(workdir, "Output"))
        payload = {key: result.get(key) for key in RESULT_KEYS}
        payload["ccdc_number"] = _extract_ccdc(cif_text)
        return jsonify(payload)
    except Exception as error:  # noqa: BLE001 - surface any pipeline failure to the caller
        return jsonify(error=str(error)), 500
    finally:
        shutil.rmtree(workdir, ignore_errors=True)


if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5000)
