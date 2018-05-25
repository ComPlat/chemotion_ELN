import 'whatwg-fetch';

import NotificationActions from '../actions/NotificationActions';

export default class ChemReadFetcher {
  static fetchInfo(files, getMol) {
    const data = new FormData();
    data.append('get_mol', getMol);
    files.forEach(file => data.append(file.uid, file.file));

    return fetch('/api/v1/chemread/embedded/upload', {
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
    return fetch('/api/v1/chemread/svg/smi', {
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
}
