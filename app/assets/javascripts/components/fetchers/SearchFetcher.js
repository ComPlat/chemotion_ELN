import 'whatwg-fetch';
import Sample from '../models/Sample';
import Reaction from '../models/Reaction';
import Wellplate from '../models/Wellplate';
import Screen from '../models/Screen';

export default class SearchFetcher {
  static fetchBasedOnSearchSelectionAndCollection(selection, collectionId) {
    let promise = fetch('/api/v1/search/' + selection.elementType, {
        credentials: 'same-origin',
        method: 'POST',
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          selection: selection,
          collection_id: collectionId
        })
      })
      .then((response) => {
        return response.json()
      }).then((json) => {
        let samples = {
          elements: json.samples.elements.map((s) => new Sample(s)),
          totalElements: json.samples.totalElements
        }
        let reactions = {
          reactions: json.reactions.elements.map((r) => new Reaction(r)),
          totalElements: json.reactions.totalElements
        }
        let wellplates = {
          wellplates: json.wellplates.elements.map((w) => new Wellplate(w)),
          totalElements: json.wellplates.totalElements
        }
        let screens = {
          screens: json.screens.elements.map((s) => new Screen(s)),
          totalElements: json.screens.totalElements
        }

        return {
          samples: samples,
          reactions: reactions,
          wellplates: wellplates,
          screens: screens
        };
      }).catch((errorMessage) => {
        console.log(errorMessage);
      });

    return promise;
  }
}
