import 'whatwg-fetch';
import _ from 'lodash';
import Sample from '../models/Sample';
import Reaction from '../models/Reaction';

export default class ReportsFetcher {
  static fetchArchives() {
    let promise = fetch('/api/v1/archives/all', {
        credentials: 'same-origin'
      })
      .then((response) => {
        return response.json()
      }).then((json) => {
        return json;
      }).catch((errorMessage) => {
        console.log(errorMessage);
      });

    return promise;
  }

  static fetchDownloadable(ids) {
    let promise = fetch('/api/v1/archives/downloadable/', {
        credentials: 'same-origin',
        method: 'POST',
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ids: ids}),
      })
      .then((response) => {
        return response.json()
      }).then((json) => {
        return json;
      }).catch((errorMessage) => {
        console.log(errorMessage);
      });

    return promise;
  }

  static create(report) {
    let promise = fetch('/api/v1/reports', {
      credentials: 'same-origin',
      method: 'post',
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(report),
    }).then((response) => {
      return response.json()
    }).then((json) => {
      return json;
    }).catch((errorMessage) => {
      console.log(errorMessage);
    });

    return promise;
  }

  static createDownloadFile(params, filename) {
    let file_name = filename
    let promise = fetch('/api/v1/reports/export_samples_from_selections', {
      credentials: 'same-origin',
      method: 'post',
      headers: {
        'Accept': 'application/vnd.ms-excel, chemical/x-mdl-sdfile',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(params),
    }).then((response) => {
      let disposition = response.headers.get('Content-Disposition')
      if (disposition && disposition.indexOf('attachment') !== -1) {
        let filenameRegex = /filename[^;=\n]*=((['"]).*?\2|[^;\n]*)/;
        let matches = filenameRegex.exec(disposition);
        if (matches != null && matches[1]) {
          file_name = matches[1].replace(/['"]/g, '');
        }
      }
      return response.blob()
    }).then((blob) => {
      console.log(blob);
      let a = document.createElement("a");
      a.style = "display: none";
      document.body.appendChild(a);
      let url = window.URL.createObjectURL(blob);
      a.href = url;
      a.download = file_name
      a.click();
      window.URL.revokeObjectURL(url);
    }).catch((errorMessage) => {
      console.log(errorMessage);
    });

    return promise;
  }

}
