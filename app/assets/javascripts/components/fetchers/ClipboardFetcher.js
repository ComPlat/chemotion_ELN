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
          all: params.sample.all,
          included_ids: params.sample.included_ids,
          excluded_ids: params.sample.excluded_ids
        },
        limit: params.limit
      })
    }).then((response) => {
      return response.json()
    }).then((json) => {
      console.log(json)
      return json;
    }).catch((errorMessage) => {
      console.log(errorMessage);
    });

    return promise;
  }
}
