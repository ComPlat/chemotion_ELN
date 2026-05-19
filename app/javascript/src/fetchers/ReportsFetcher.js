import 'whatwg-fetch';
import _ from 'lodash';
import NotificationActions from 'src/stores/alt/actions/NotificationActions';
import { downloadBlob } from 'src/utilities/FetcherHelper';

export default class ReportsFetcher {
  static fetchArchives() {
    const promise = fetch('/api/v1/archives/all', {
      credentials: 'same-origin'
    })
      .then((response) => response.json()).then((json) => json).catch((errorMessage) => {
        console.log(errorMessage);
      });

    return promise;
  }

  static deleteArchive(archive_id) {
    const promise = fetch(`/api/v1/archives/${archive_id}`, {
      credentials: 'same-origin',
      method: 'DELETE',
    })
      .then((response) => {
        if (response.status == 200) { return archive_id; }
      }).catch((errorMessage) => {
        console.log(errorMessage);
      });

    return promise;
  }

  static fetchDownloadable(ids) {
    const promise = fetch('/api/v1/archives/downloadable/', {
      credentials: 'same-origin',
      method: 'POST',
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ ids }),
    })
      .then((response) => response.json()).then((json) => json).catch((errorMessage) => {
        console.log(errorMessage);
      });

    return promise;
  }

  static create(report) {
    const promise = fetch('/api/v1/reports', {
      credentials: 'same-origin',
      method: 'post',
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(report),
    }).then((response) => response.json()).then((json) => {
      if (json.error) {
        NotificationActions.add({
          title: json.error,
          message: 'Please reload the page to try it again!',
          level: 'error',
          dismissible: 'button',
          position: 'tr',
        });

        return null;
      }
      return json;
    }).catch((errorMessage) => {
      console.log(errorMessage);
    });

    return promise;
  }

  static createDownloadFile(params, filename, route = 'export_samples_from_selections') {
    let fileName = filename;
    const promise = fetch(`/api/v1/reports/${route}`, {
      credentials: 'same-origin',
      method: 'post',
      headers: {
        Accept: 'application/vnd.ms-excel, chemical/x-mdl-sdfile, text/csv, application/zip, application/octet-stream',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(params),
    }).then((response) => {
      if (response.status === 204) {
        NotificationActions.add({
          title: 'Nothing Selected',
          message: 'Please select the elements to export and try again!',
          level: 'warning',
          dismissible: 'button',
          position: 'tr',
        });
        return null;
      }
      const disposition = response.headers.get('Content-Disposition');
      if (disposition && disposition.indexOf('attachment') !== -1) {
        const filenameRegex = /filename[^;=\n]*=((['"]).*?\2|[^;\n]*)/;
        const matches = filenameRegex.exec(disposition);
        if (matches != null && matches[1]) {
          fileName = matches[1].replace(/['"]/g, '');
        }
      }
      return response.blob();
    }).then((blob) => {
      if (!blob || blob.size === 0) return;
      const a = document.createElement('a');
      a.style = 'display: none';
      document.body.appendChild(a);
      const url = window.URL.createObjectURL(blob);
      a.href = url;
      a.download = fileName;
      a.click();
      window.URL.revokeObjectURL(url);
    }).catch((errorMessage) => {
      console.log(errorMessage);
    });

    return promise;
  }

  static exportSamples(type, id) {
    const fileName = `${type.charAt(0).toUpperCase() + type.substring(1)}_${id}_Samples Excel.xlsx`;
    return fetch(`/api/v1/reports/excel_${type}?id=${id}`, {
      credentials: 'same-origin',
      headers: { Accept: 'application/json', 'Content-Type': 'application/json' }
    }).then((response) => {
      if (response.ok) { return response.blob(); }
      throw Error(response.statusText);
    }).then((blob) => {
      downloadBlob(fileName, blob);
    }).catch((errorMessage) => {
      console.log(errorMessage);
    });
  }
}
