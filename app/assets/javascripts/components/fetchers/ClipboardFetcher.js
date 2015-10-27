import 'whatwg-fetch';

export default class ClipboardFetcher {
  static fetchSamplesByUIStateAndLimit(params) {
    let limit = params.limit ? limit : null;

    let promise = fetch('/api/v1/samples/ui_state/', {
      credentials: 'same-origin',
      method: 'POST',
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        ui_state: {
          all: params.sample.checkedAll,
          included_ids: params.sample.checkedIds,
          excluded_ids: params.sample.uncheckedIds
        },
        limit: limit
      })
    }).then((response) => {
      return response.json()
    }).then((json) => {
      return json;
    }).catch((errorMessage) => {
      console.log(errorMessage);
    });

    return promise;
}
