import 'whatwg-fetch';
import GenericBaseFetcher from 'src/fetchers/GenericBaseFetcher';
import { getFileName, downloadBlob } from 'src/utilities/FetcherHelper';

export default class GenericKlassFetcher extends GenericBaseFetcher {
  static exec(path, method) {
    return super.exec(`generic_klass/${path}`, method);
  }

  static execData(params, path) {
    return super.execData(params, `generic_klass/${path}`);
  }

  static downloadKlass(id, klass) {
    let fileName;
    const promise = fetch(`/api/v1/generic_klass/download_klass.json?id=${id}&klass=${klass}`, {
      credentials: 'same-origin',
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json'
      }
    }).then((response) => {
      if (response.ok) {
        fileName = getFileName(response);
        return response.blob();
      }
      return Promise.reject(new Error('Response not OK. Download failed.'));
    }).then((blob) => {
      downloadBlob(fileName, blob);
    }).catch((errorMessage) => {
      console.log(errorMessage);
    });
    return promise;
  }
}
