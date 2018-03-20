import 'whatwg-fetch';
import Sample from '../models/Sample';
import Reaction from '../models/Reaction';
import Wellplate from '../models/Wellplate';
import Screen from '../models/Screen';

export default class SearchFetcher {
  static fetchBasedOnSearchSelectionAndCollection(params) {
    const { selection, collectionId, currentPage, isSync, moleculeSort, isPublic } = params;
    return fetch(`/api/v1/search/${selection.elementType.toLowerCase()}`, {
      credentials: 'same-origin',
      method: 'POST',
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        selection,
        collection_id: collectionId,
        page: currentPage || 1,
        per_page: selection.page_size,
        is_sync: isSync || false,
        molecule_sort: moleculeSort || false,
        is_public: isPublic || false,
      })
    }).then(response => response.json())
      .then((json) => {
        const { samples, reactions, wellplates, screens } = json;
        const result = { ...json };
        if (samples && samples.totalElements && samples.totalElements > 0) {
          result.samples.elements = samples.elements.molecules.map(
            m => (m.samples.map(s => (new Sample(s))))
          );
        } else { result.samples = { elements: [], totalElements: 0, ids: [] }; }
        if (reactions && reactions.totalElements && reactions.totalElements > 0) {
          result.reactions.elements = reactions.elements.map(r => (new Reaction(r)));
        } else { result.reactions = { elements: [], totalElements: 0, ids: [] }; }
        if (wellplates && wellplates.totalElements && wellplates.totalElements > 0) {
          result.wellplates.elements = wellplates.elements.map(s => (new Wellplate(s)));
        } else { result.wellplates = { elements: [], totalElements: 0, ids: [] }; }
        if (screens && screens.totalElements && screens.totalElements > 0) {
          result.screens.elements = screens.elements.map(s => (new Screen(s)));
        } else { result.screens = { elements: [], totalElements: 0, ids: [] }; }
        return result;
      }).catch((errorMessage) => { console.log(errorMessage); });
  }
}
