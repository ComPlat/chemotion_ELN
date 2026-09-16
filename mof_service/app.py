"""Tiny HTTP wrapper around the snurr-group `mofid` package.

Accepts a CIF file and returns the computed MOFid / MOFkey (and the
intermediate SMILES / topology data), mirroring the Snurr group's
web-mofid tool but running server-side so Chemotion can call it over HTTP
the same way it already calls the Indigo service.
"""

import logging
import os
import re
import shutil
import tempfile
from functools import reduce
from math import gcd

from flask import Flask, jsonify, request

from openbabel import openbabel as ob

from mofid.run_mofid import cif2mofid

logger = logging.getLogger("mof_service")
logger.setLevel(logging.INFO)
# Under gunicorn, reuse its handlers so our INFO lines reach the container log.
# (A bare logging.basicConfig is a no-op once gunicorn has configured the root
# logger, so those lines would be silently dropped.)
_gunicorn_logger = logging.getLogger("gunicorn.error")
if _gunicorn_logger.handlers:
    logger.handlers = _gunicorn_logger.handlers
else:
    logging.basicConfig(level=logging.INFO)

logger.info("mof_service loaded (component ratios enabled)")

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


def _split_smiles(value):
    """Flatten a SMILES value (string or list, '.'-separated) into an ordered list
    of individual building-block SMILES. Mirrors the frontend's toSmilesList so the
    ratio arrays we return stay index-aligned with the fragment rows."""
    items = value if isinstance(value, list) else [value]
    result = []
    for item in items:
        for part in str(item or "").split("."):
            part = part.strip()
            if part:
                result.append(part)
    return result


def _canonical_smiles(text, in_format="smi"):
    """Canonical SMILES for a structure, or None if it cannot be parsed."""
    conv = ob.OBConversion()
    if not conv.SetInFormat(in_format):
        return None
    mol = ob.OBMol()
    if not conv.ReadString(mol, text) or mol.NumAtoms() == 0:
        return None
    conv.SetOutFormat("can")
    out = conv.WriteString(mol).strip().split()
    return out[0] if out else None


def _count_fragments(cif_path):
    """Count the building-block instances in a decomposition CIF (mofid writes the
    nodes and linkers of the whole unit cell, with the other component stripped so
    each block is discrete). Returns ({canonical_smiles: count}, total_count)."""
    if not cif_path or not os.path.exists(cif_path):
        return {}, 0
    conv = ob.OBConversion()
    if not conv.SetInFormat("cif"):
        return {}, 0
    mol = ob.OBMol()
    if not conv.ReadFile(mol, cif_path) or mol.NumAtoms() == 0:
        return {}, 0
    conv.SetOutFormat("can")
    counts = {}
    total = 0
    for frag in mol.Separate():
        smiles = conv.WriteString(frag).strip().split()
        if not smiles:
            continue
        key = smiles[0]
        counts[key] = counts.get(key, 0) + 1
        total += 1
    return counts, total


def _assign_counts(smiles_list, counts, total):
    """Map each building block in smiles_list to its instance count. A single block
    takes the whole file's count (its SMILES may differ from the decomposed cluster,
    e.g. a bare metal vs the full metal-oxo node). Returns None if any block with
    siblings cannot be matched, so a partial ratio is never reported."""
    if not smiles_list:
        return None
    if len(smiles_list) == 1:
        return [total] if total else None
    resolved = []
    for smiles in smiles_list:
        count = counts.get(_canonical_smiles(smiles))
        if not count:
            return None
        resolved.append(count)
    return resolved


def _component_ratios(output_path, result):
    """Derive the node/linker stoichiometry from mofid's decomposition output as
    smallest-integer ratios aligned to smiles_nodes / smiles_linkers (e.g. 4 nodes
    and 24 linkers -> [1] and [6]). Returns (None, None) when it cannot be resolved
    for every building block, leaving the ratios at their default."""
    metal_oxo = os.path.join(output_path, "MetalOxo")
    node_counts, node_total = _count_fragments(os.path.join(metal_oxo, "nodes.cif"))
    linker_counts, linker_total = _count_fragments(os.path.join(metal_oxo, "linkers.cif"))

    node_smiles = _split_smiles(result.get("smiles_nodes"))
    linker_smiles = _split_smiles(result.get("smiles_linkers"))
    node_ratios = _assign_counts(node_smiles, node_counts, node_total)
    linker_ratios = _assign_counts(linker_smiles, linker_counts, linker_total)

    logger.info(
        "MOF ratios: node smiles=%s counts=%s total=%d | linker smiles=%s counts=%s total=%d "
        "| assigned nodes=%s linkers=%s",
        node_smiles, node_counts, node_total,
        linker_smiles, linker_counts, linker_total,
        node_ratios, linker_ratios,
    )

    if not node_ratios or not linker_ratios:
        return None, None

    divisor = reduce(gcd, node_ratios + linker_ratios, 0)
    if divisor <= 0:
        return None, None
    reduced_nodes = [c // divisor for c in node_ratios]
    reduced_linkers = [c // divisor for c in linker_ratios]
    logger.info("MOF ratios reduced (divisor=%d): nodes=%s linkers=%s", divisor, reduced_nodes, reduced_linkers)
    return reduced_nodes, reduced_linkers


def _extract_cif():
    """Read CIF text from JSON body, a multipart file, or the raw body."""
    if request.is_json:
        payload  = request.get_json(silent=True)
        # A valid JSON body is authoritative: return its cif, or None if omitted.
        # Only fall through to the raw body when JSON parsing failed.
        if payload  is not None:
            cif = payload.get("cif")
            return cif if cif else None
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
    logger.info("analyze: received CIF (%d bytes)", len(cif_text))

    workdir = tempfile.mkdtemp(prefix="mofid_")
    try:
        cif_path = os.path.join(workdir, "input.cif")
        with open(cif_path, "w", encoding="utf-8") as handle:
            handle.write(cif_text)

        output_path = os.path.join(workdir, "Output")
        result = cif2mofid(cif_path, output_path=output_path)
        payload = {key: result.get(key) for key in RESULT_KEYS}
        payload["ccdc_number"] = _extract_ccdc(cif_text)

        # Node/linker stoichiometry, counted from the decomposition mofid already
        # wrote (the final MOFid keeps only unique blocks, dropping multiplicity).
        node_ratios, linker_ratios = _component_ratios(output_path, result)
        if node_ratios is not None:
            payload["node_ratios"] = node_ratios
            payload["linker_ratios"] = linker_ratios
        return jsonify(payload)
    except Exception as error:  # noqa: BLE001 - surface any pipeline failure to the caller
        return jsonify(error=str(error)), 500
    finally:
        shutil.rmtree(workdir, ignore_errors=True)


if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5000)
