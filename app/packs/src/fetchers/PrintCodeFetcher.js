import 'whatwg-fetch';

export default class PrintCodeFetcher {
  static fetchPrintCodes(url) {
    // Request options for fetching the PDF.
    const requestOptions = {
      credentials: 'same-origin',
      method: 'GET',
    };
    // Fetch the PDF and set the preview.
    return fetch(url, requestOptions)
      .then((response) => response.blob())
      .then((blob) => ({ type: blob.type, data: URL.createObjectURL(blob) }))
      .then((result) => result.data)
      .catch((errorMessage) => {
        console.log(errorMessage);
      });
  }

  static fetchMergedPrintCodes(url) {
    // Request options for fetching the PDF.
    const requestOptions = {
      credentials: 'same-origin',
      method: 'GET',
    };
    // Fetch the PDF
    return fetch(url, requestOptions)
      .then((response) => response.blob())
      .then((result) => result.arrayBuffer())
      .catch((errorMessage) => {
        console.log(errorMessage);
      });
  }
}
