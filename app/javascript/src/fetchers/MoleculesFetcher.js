import ApiClient from 'src/api_clients/ChemotionApiClient';

export default class MoleculesFetcher {
  static fetchSciFinder(params) {
    return ApiClient.postJson('/api/v1/molecules/sf', { body: params });
  }

  static fetchByMolfile(molfile, svgfile, editor = 'ketcher', decoupled = false) {
    return ApiClient.postJson('/api/v1/molecules', {
      body: {
        molfile, svg_file: svgfile, editor, decoupled
      }
    });
  }

  static fetchBySmi(smi, svgfile, molfile, editor = 'ketcher') {
    return ApiClient.postJson('/api/v1/molecules/smiles', {
      body: {
        smiles: smi, svg_file: svgfile, layout: molfile, editor
      }
    });
  }

  static fetchCas(inchikey) {
    return ApiClient.getJson(`/api/v1/molecules/cas?inchikey=${inchikey}`);
  }

  static updateNames(id, newMolName = '') {
    return ApiClient.getJson(`/api/v1/molecules/names?${new URLSearchParams({ id, new_name: newMolName })}`)
      .then((json) => json.molecules);
  }

  static computePropsFromSmiles(sampleId) {
    return ApiClient.postJson('/api/v1/molecules/compute', { body: { sampleId } });
  }

  static getByInChiKey(inchikey) {
    return ApiClient.postJson('/api/v1/molecules/inchikey', { body: { inchikey } });
  }

  static renewSVGFile(id, svgFile, isChemdraw = false) {
    return ApiClient.postJson('/api/v1/molecules/svg', { body: { id, svg_file: svgFile, is_chemdraw: isChemdraw } });
  }

  static updateMolfileSVG(molecule) {
    return ApiClient.postJson('/api/v1/molecules/editor', {
      body: {
        id: molecule.id, molfile: molecule.molfile, svg_file: molecule.molecule_svg_file
      }
    });
  }

  static deleteMoleculeName(params) {
    return ApiClient.postJson('/api/v1/molecules/delete_name', { body: params });
  }

  static saveMoleculeName(params) {
    return ApiClient.postJson('/api/v1/molecules/save_name', { body: params });
  }

  static decouple(molfile, svgfile, decoupled = false) {
    return ApiClient.postJson('/api/v1/molecules/decouple', { body: { molfile, svg_name: svgfile, decoupled } });
  }

  static calculateMolecularMassFromSumFormula(molecularFormula) {
    const encodedMolecularFormula = encodeURIComponent(molecularFormula);
    return ApiClient.getJson(`/api/v1/molecules/molecular_weight?molecular_formula=${encodedMolecularFormula}`);
  }
}
