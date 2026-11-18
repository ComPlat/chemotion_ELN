import ApiClient from 'src/api_clients/ChemotionApiClient';
import _ from 'lodash';
import { rootStore } from 'src/stores/mobx/RootStore';
import { downloadBlob } from 'src/utilities/FetcherHelper';

export default class ReportsFetcher {
  static fetchArchives() {
    return ApiClient.getJson('/api/v1/archives/all');
  }

  static deleteArchive(archiveId) {
    return ApiClient.deleteRequest(`/api/v1/archives/${archiveId}`, {
      handleResponseSuccess: (response) => {
        if (response.status === 200) { return archiveId; }
      }
    });
  }

  static fetchDownloadable(ids) {
    return ApiClient.postJson('/api/v1/archives/downloadable', { body: { ids } });
  }

  static create(report) {
    return ApiClient.postJson('/api/v1/reports', { body: report })
      .then((json) => {
        if (json.error) {
          rootStore.notificationsStore.add({
            title: json.error,
            message: 'Please reload the page to try it again!',
            level: 'error',
            position: 'tr',
          });
          return null;
        }
        return json;
      });
  }

  static createDownloadFile(params, filename, route = 'export_samples_from_selections') {
    let fileName = filename;
    return ApiClient.postJson(`/api/v1/reports/${route}`, {
      body: params,
      handleResponseSuccess: (response) => {
        if (response.status === 204) {
          rootStore.notificationsStore.add({
            title: 'Nothing Selected',
            message: 'Please select the elements to export and try again!',
            level: 'warning',
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
      }
    })
      .then((blob) => {
        if (!blob || blob.size === 0) return;
        const a = document.createElement('a');
        a.style = 'display: none';
        document.body.appendChild(a);
        const url = window.URL.createObjectURL(blob);
        a.href = url;
        a.download = fileName;
        a.click();
        window.URL.revokeObjectURL(url);
      });
  }

  static exportSamples(type, id) {
    const fileName = `${type.charAt(0).toUpperCase() + type.substring(1)}_${id}_Samples Excel.xlsx`;
    return ApiClient.getJson(`/api/v1/reports/excel_${type}?id=${id}`, {
      handleResponseSuccess: (response) => {
        if (response.ok) { return response.blob(); }
        throw Error(response.statusText);
      }
    })
      .then((blob) => {
        downloadBlob(fileName, blob);
      });
  }
}
