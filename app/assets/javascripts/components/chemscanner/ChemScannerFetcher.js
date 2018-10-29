import 'whatwg-fetch';

import NotificationActions from '../actions/NotificationActions';

export default class ChemScannerFetcher {
  static fetchInfo(files, getMol) {
    const data = new FormData();
    data.append('get_mol', getMol);
    files.forEach(file => data.append(file.uid, file.file));

    return fetch('/api/v1/chemscanner/embedded/upload', {
      credentials: 'same-origin',
      method: 'post',
      body: data
    }).then((response) => {
      if (response.ok === false) {
        let msg = 'Files uploading failed: ';
        if (response.status === 413) {
          msg += 'File size limit exceeded. Max size is 50MB';
        } else {
          msg += response.statusText;
        }

        NotificationActions.add({
          message: msg,
          level: 'error'
        });
      }
      return response.json();
    });
  }

  static fetchSvgFromSmis(smiArr) {
    return fetch('/api/v1/chemscanner/svg/smi', {
      credentials: 'same-origin',
      method: 'post',
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ smiArr })
    }).then((response) => {
      if (response.ok === false) {
        let msg = 'Files uploading failed: ';
        if (response.status === 413) {
          msg += 'File size limit exceeded. Max size is 50MB';
        } else {
          msg += response.statusText;
        }

        NotificationActions.add({
          message: msg,
          level: 'error'
        });
      }
      return response.json();
    });
  }

  static fetchAbbreviations() {
    return fetch('/api/v1/chemscanner/abbreviations/all', {
      credentials: 'same-origin',
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json'
      },
      method: 'post',
      body: JSON.stringify({ pageSize: 10, page: 1 })
    }).then((response) => {
      if (response.ok === false) {
        const msg = `ChemScanner fetching failed: ${response.statusText}`;

        NotificationActions.add({
          message: msg,
          level: 'error'
        });
      }
      return response.json();
    });
  }

  static addAbbreviation(abb, smiles, newAbb) {
    return fetch('/api/v1/chemscanner/abbreviations/add', {
      credentials: 'same-origin',
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json'
      },
      method: 'post',
      body: JSON.stringify({ abb, smiles, newAbb })
    }).then((response) => {
      if (response.ok === false) {
        const msg = `ChemScanner fetching failed: ${response.statusText}`;

        NotificationActions.add({
          message: msg,
          level: 'error'
        });
      }
      return response.json();
    });
  }

  static removeAbbreviation(data, newAbb) {
    return fetch('/api/v1/chemscanner/abbreviations/remove', {
      credentials: 'same-origin',
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json'
      },
      method: 'post',
      body: JSON.stringify({ data, newAbb })
    }).then((response) => {
      if (response.ok === false) {
        const msg = `ChemScanner fetching failed: ${response.statusText}`;

        NotificationActions.add({
          message: msg,
          level: 'error'
        });
      }
      return response.json();
    });
  }

  static getCml(objects, getMol) {
    return fetch('/api/v1/chemscanner/export/cml', {
      credentials: 'same-origin',
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json'
      },
      method: 'post',
      body: JSON.stringify({ objects, getMol })
    }).then((response) => {
      if (response.ok === false) {
        const msg = `ChemScanner CML exporting failed: ${response.statusText}`;

        NotificationActions.add({
          message: msg,
          level: 'error'
        });
      }

      return response.json();
    });
  }
}
