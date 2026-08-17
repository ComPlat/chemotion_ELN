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

from openbabel import openbabel as ob

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


# Elements treated as non-metal / metalloid; everything else (with Z > 2) is a
# metal node atom for the purpose of splitting metal-ligand coordination bonds.
_NON_METALS = {1, 2, 5, 6, 7, 8, 9, 10, 14, 15, 16, 17, 18, 33, 34, 35, 36, 52, 53, 54, 85, 86}


def _is_metal(atomic_num):
    return atomic_num not in _NON_METALS


def _fragment_structure(text, in_format):
    """Split a connected structure into MOF building blocks by breaking every
    metal-to-non-metal bond (the coordination bonds that hold nodes and linkers
    together), then classify each fragment: metal-containing -> node, otherwise
    -> linker. Returns (nodes, linkers) as canonical-SMILES lists.
    """
    conv = ob.OBConversion()
    if not conv.SetInFormat(in_format):
        raise ValueError(f"Unsupported input format: {in_format}")
    mol = ob.OBMol()
    if not conv.ReadString(mol, text) or mol.NumAtoms() == 0:
        raise ValueError("Could not parse the structure")

    doomed = [
        bond for bond in ob.OBMolBondIter(mol)
        if _is_metal(bond.GetBeginAtom().GetAtomicNum())
        != _is_metal(bond.GetEndAtom().GetAtomicNum())
    ]
    for bond in doomed:
        mol.DeleteBond(bond)

    conv.SetOutFormat("can")
    nodes, linkers = [], []
    for frag in mol.Separate():
        smiles = conv.WriteString(frag).strip().split()
        if not smiles:
            continue
        smiles = smiles[0]
        has_metal = any(_is_metal(atom.GetAtomicNum()) for atom in ob.OBMolAtomIter(frag))
        (nodes if has_metal else linkers).append(smiles)
    return nodes, linkers


@app.route("/health", methods=["GET"])
def health():
    return jsonify(status="ok")


@app.route("/fragment", methods=["POST"])
def fragment():
    """Decompose a drawn structure (molfile or SMILES) into nodes and linkers.

    Unlike /analyze this does not need a periodic CIF, so it returns building
    blocks only (no topology / MOFid / MOFkey).
    """
    data = request.get_json(silent=True) or {}
    molfile = (data.get("molfile") or "").strip()
    smiles = (data.get("smiles") or "").strip()

    try:
        if molfile:
            nodes, linkers = _fragment_structure(molfile, "mol")
        elif smiles:
            nodes, linkers = _fragment_structure(smiles, "smi")
        else:
            return jsonify(error="No structure provided"), 400
    except Exception as error:  # noqa: BLE001 - surface parse/fragment failures to the caller
        return jsonify(error=str(error)), 500

    return jsonify(nodes=nodes, linkers=linkers)


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
