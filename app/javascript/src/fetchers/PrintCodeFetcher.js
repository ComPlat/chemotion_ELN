import ApiClient from 'src/api_clients/ChemotionApiClient';

export default class PrintCodeFetcher {
  static fetchPrintCodes(url) {
    // Fetch the PDF and set the preview.
    return ApiClient.getJson(url, { handleResponseSuccess: (response) => response.blob() })
      .then((blob) => ({ type: blob.type, data: URL.createObjectURL(blob) }))
      .then((result) => result.data);
  }

  static fetchMergedPrintCodes(url) {
    // Fetch the PDF
    return ApiClient.getJson(url, { handleResponseSuccess: (response) => response.blob() })
      .then((result) => result.arrayBuffer());
  }
}
