import 'whatwg-fetch';

export default class MoleculesFetcher {
  static fetchByMolfile(molfile, svg_file) {
    let promise = fetch('/api/v1/molecules', {
      credentials: 'same-origin',
      method: 'POST',
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        molfile: molfile,
        svg_file: svg_file
      })
    }).then((response) => {
      return response.json()
    }).then((json) => {
      return json;
    }).catch((errorMessage) => {
      console.log(errorMessage);
    });

    return promise;
  }

  static fetchBySmi(smi, svgfile, molfile) {
    const promise = fetch('/api/v1/molecules/smiles', {
      credentials: 'same-origin',
      method: 'POST',
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        smiles: smi,
        svg_file: svgfile,
        layout: molfile
      })
    }).then(response => response.json()).then((json) => {
      return json;
    }).catch((errorMessage) => {
      console.log(errorMessage);
    });

    return promise;
  }

  static fetchCas(inchikey) {
    let promise = fetch(`/api/v1/molecules/cas?inchikey=${inchikey}`, {
        credentials: 'same-origin'
      })
      .then((response) => {
        return response.json()
      }).then((json) => {
        return json
      }).catch((errorMessage) => {
        console.log(errorMessage)
      })

    return promise
  }

  static updateNames(inchikey, newMolName = '') {
    const promise = fetch(`/api/v1/molecules/names?inchikey=${inchikey}` +
      `&new_name=${newMolName}`, {
      credentials: 'same-origin',
    }).then(response => response.json())
      .then(json => json.molecules)
      .catch(errorMessage => console.log(errorMessage));

    return promise;
  }

  static computePropsFromSmiles(sampleId) {
    const promise = fetch('/api/v1/molecules/compute', {
      credentials: 'same-origin',
      method: 'POST',
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ sampleId })
    }).then(response => response.json()).catch((errorMessage) => {
      console.log(errorMessage);
    });

    return promise;
  }
}
