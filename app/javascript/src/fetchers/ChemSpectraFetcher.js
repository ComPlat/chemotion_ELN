import { SPECTRA_DATA_TYPE } from 'src/endpoints/ApiServices';
import 'whatwg-fetch';

export default class ChemSpectraFetcher {
  static fetchSpectraLayouts() {
    return fetch('/api/v1/chemspectra/spectra_layouts', {
      method: 'GET',
      credentials: 'same-origin',
    }).then((response) => {
      if (response.ok) {
        return response.json();
      }
      return null;
    })
      .then((data) => data)
      .catch((errorMessage) => { console.error(errorMessage); });
  }

  static updateDataTypes(newDataTypes) {
    const requestData = { datatypes: newDataTypes };

    return fetch('/api/v1/admin/data_types.json', {
      credentials: 'same-origin',
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestData)
    }).then((response) => {
      if (!response.ok) { throw response; }
      return response.json();
    });
  }

  static fetchUpdatedSpectraLayouts() {
    return fetch(SPECTRA_DATA_TYPE)
      .then((response) => {
        if (!response.ok) {
          throw new Error('Failed to fetch JSON');
        }
        return response.json();
      })
      .then((data) => Object.entries(data.datatypes));
  }
}
