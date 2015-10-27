import 'whatwg-fetch';
import Sample from '../models/Sample';

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
          excluded_ids: params.sample.excluded_ids,
          collection_id: params.sample.collection_id
        },
        limit: params.limit
      })
    }).then((response) => {
      return response.json()
    }).then((json) => {
      return json.samples.map((s) => new Sample(s));
    }).catch((errorMessage) => {
      console.log(errorMessage);
    });

    return promise;
  }
}
