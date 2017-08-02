import 'whatwg-fetch';
import _ from 'lodash';
import Sample from '../models/Sample';
import Reaction from '../models/Reaction';

export default class GeneralFetcher {
  static fetchListContent(ids) {
    let promise = fetch(`/api/v1/general/list_content?ids=${JSON.stringify(ids)}`, {
        credentials: 'same-origin'
      })
      .then((response) => {
        return response.json()
      }).then((json) => {
        const samples = json.samples.map(s => new Sample(s));
        const reactions = json.reactions.map(r => new Reaction(r));
        return { samples, reactions };
      }).catch((errorMessage) => {
        console.log(errorMessage);
      });

    return promise;
  }
}
