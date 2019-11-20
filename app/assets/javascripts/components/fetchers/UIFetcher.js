import 'whatwg-fetch';
import { camelizeKeys } from 'humps';

import Sample from '../models/Sample';
import Reaction from '../models/Reaction';

export default class UIFetcher {
  static initialize() {
    const promise = fetch('/api/v1/ui/initialize', {
      credentials: 'same-origin',
    }).then(response => response.json())
      .then(json => camelizeKeys(json))
      .catch(err => console.log(err)); // eslint-disable-line

    return promise;
  }

  static fetchByUIState(params, method = 'POST') {
    return fetch('/api/v1/ui_state/', {
      credentials: 'same-origin',
      method,
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(params)
    }).then(response => response.json())
      .then((json) => {
        if (method === 'DELETE') { return json; }
        const samples = json.samples.map(s => new Sample(s));
        const reactions = json.reactions.map(r => new Reaction(r));
        return { samples, reactions };
      })
      .catch((errorMessage) => { console.log(errorMessage); });
  }

  static loadReportElements(params) {
    return fetch('/api/v1/ui_state/load_report_elements', {
      credentials: 'same-origin',
      method: 'POST',
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(params)
    }).then(response => response.json())
      .then((json) => {
        const samples = json.samples.map(s => new Sample(s));
        const reactions = json.reactions.map(r => new Reaction(r));
        return { samples, reactions };
      })
      .catch((errorMessage) => { console.log(errorMessage); });
  }
}
