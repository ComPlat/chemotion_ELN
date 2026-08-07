import ApiClient from 'src/api_clients/ChemotionApiClient';
import GenericBaseFetcher from 'src/fetchers/GenericBaseFetcher';
import { getFileName, downloadBlob } from 'src/utilities/FetcherHelper';

export default class GenericKlassFetcher extends GenericBaseFetcher {
  static downloadKlass(id, klass) {
    let fileName;
    return ApiClient.getJson(`/api/v1/generic_klass/download_klass?${new URLSearchParams({ id, klass })}`, {
      handleResponseSuccess: (response) => {
        if (response.ok) {
          fileName = getFileName(response);
          return response.blob();
        }
        return Promise.reject(new Error('Response not OK. Download failed.'));
      }
    })
      .then((blob) => {
        downloadBlob(fileName, blob);
      });
  }
}
