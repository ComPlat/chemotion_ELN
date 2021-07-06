import 'whatwg-fetch';

export default class MoleculesFetcher {
  static fetchByMolfile(molfile, svgfile) {
    return fetch('/api/v1/molecules', {
      credentials: 'same-origin',
      method: 'POST',
      headers: { Accept: 'application/json', 'Content-Type': 'application/json' },
      body: JSON.stringify({ molfile, svg_file: svgfile })
    }).then(response => response.json()).then(json => json)
      .catch(errorMessage => console.log(errorMessage));
  }

  static fetchBySmi(smi, svgfile, molfile) {
    return fetch('/api/v1/molecules/smiles', {
      credentials: 'same-origin',
      method: 'POST',
      headers: { Accept: 'application/json', 'Content-Type': 'application/json' },
      body: JSON.stringify({
        smiles: smi, svg_file: svgfile, layout: molfile
      })
    }).then(response => response.json()).then(json => json)
      .catch(errorMessage => console.log(errorMessage));
  }

  static fetchCas(inchikey) {
    return fetch(`/api/v1/molecules/cas?inchikey=${inchikey}`, {
      credentials: 'same-origin'
    }).then(response => response.json()).then(json => json)
      .catch(errorMessage => console.log(errorMessage));
  }

  static updateNames(inchikey, newMolName = '') {
    return fetch(`/api/v1/molecules/names?inchikey=${inchikey}` +
      `&new_name=${escape(newMolName)}`, {
      credentials: 'same-origin',
    }).then(response => response.json()).then(json => json.molecules)
      .catch(errorMessage => console.log(errorMessage));
  }

  static computePropsFromSmiles(sampleId) {
    return fetch('/api/v1/molecules/compute', {
      credentials: 'same-origin',
      method: 'POST',
      headers: { Accept: 'application/json', 'Content-Type': 'application/json' },
      body: JSON.stringify({ sampleId })
    }).then(response => response.json())
      .catch(errorMessage => console.log(errorMessage));
  }

  static getByInChiKey(inchikey) {
    return fetch('/api/v1/molecules/inchikey', {
      credentials: 'same-origin',
      method: 'POST',
      headers: { Accept: 'application/json', 'Content-Type': 'application/json' },
      body: JSON.stringify({ inchikey })
    }).then(response => response.json())
      .catch(errorMessage => console.log(errorMessage));
  }

  static renewSVGFile(id, svgFile, isChemdraw = false) {
    return fetch('/api/v1/molecules/svg', {
      credentials: 'same-origin',
      method: 'POST',
      headers: { Accept: 'application/json', 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, svg_file: svgFile, is_chemdraw: isChemdraw })
    }).then(response => response.json())
      .catch(errorMessage => console.log(errorMessage));
  }

  static updateMolfileSVG(molecule) {
    return fetch('/api/v1/molecules/editor', {
      credentials: 'same-origin',
      method: 'POST',
      headers: { Accept: 'application/json', 'Content-Type': 'application/json' },
      body: JSON.stringify({
        id: molecule.id, molfile: molecule.molfile, svg_file: molecule.molecule_svg_file
      })
    }).then(response => response.json())
      .catch(errorMessage => console.log(errorMessage));
  }

  static deleteMoleculeName(params) {
    return fetch('/api/v1/molecules/delete_name', {
      credentials: 'same-origin',
      method: 'POST',
      headers: { Accept: 'application/json', 'Content-Type': 'application/json' },
      body: JSON.stringify(params)
    }).then(response => response.json())
      .catch(errorMessage => console.log(errorMessage));
  }

  static saveMoleculeName(params) {
    return fetch('/api/v1/molecules/save_name', {
      credentials: 'same-origin',
      method: 'POST',
      headers: { Accept: 'application/json', 'Content-Type': 'application/json' },
      body: JSON.stringify(params)
    }).then(response => response.json())
      .catch(errorMessage => console.log(errorMessage));
  }

  static decouple(molfile, svgfile, decoupled = false) {
    return fetch('/api/v1/molecules/decouple', {
      credentials: 'same-origin',
      method: 'POST',
      headers: { Accept: 'application/json', 'Content-Type': 'application/json' },
      body: JSON.stringify({ molfile, svg_name: svgfile, decoupled })
    }).then(response => response.json()).then(json => json)
      .catch(errorMessage => console.log(errorMessage));
  }
}
