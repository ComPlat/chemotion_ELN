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
      .then((response) => {
        if (!response.ok) {
          throw new Error(`Print code request failed: ${response.status} ${response.statusText}`);
        }
        return response.blob();
      })
      .then((result) => result.arrayBuffer());
  }

  // POST a ui_state-style payload to the print_codes_by_ui_state endpoint so
  // the server can resolve "select all pages" semantics (checkedAll +
  // uncheckedIds) and return a single multi-page PDF for the resolved set.
  // @param {object} payload - { element_type, ui_state: { checkedAll, checkedIds, uncheckedIds, collection_id, is_sync_to_me }, ...printConfig }
  // @returns {Promise<ArrayBuffer>}
  static fetchPrintCodesByUIState(payload) {
    return fetch('/api/v1/code_logs/print_codes_by_ui_state', {
      credentials: 'same-origin',
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    })
      .then((response) => {
        if (!response.ok) {
          throw new Error(`Print code request failed: ${response.status} ${response.statusText}`);
        }
        return response.blob();
      })
      .then((blob) => blob.arrayBuffer());
  }
}
