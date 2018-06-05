import 'whatwg-fetch';
import Sample from '../models/Sample';
import Reaction from '../models/Reaction';

export default class UIFetcher {
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
}
