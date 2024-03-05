import 'whatwg-fetch';
import Sample from '../models/Sample';
import Reaction from '../models/Reaction';
import Wellplate from '../models/Wellplate';
import Screen from '../models/Screen';
import GenericEl from '../models/GenericEl';
import ResearchPlan from '../models/ResearchPlan';

export default class SearchFetcher {
  static fetchBasedOnSearchSelectionAndCollection(params) {
    const { selection, collectionId, page, isSync, moleculeSort, isPublic } = params;
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
        page: page || 1,
        per_page: selection.page_size,
        is_sync: isSync || false,
        molecule_sort: moleculeSort || false,
        is_public: isPublic || false,
      })
    }).then(response => response.json())
      .then((json) => {
        const { samples, reactions, wellplates, screens, research_plans } = json;
        const result = { ...json };

        Object.keys(json).forEach((key) => {
          switch (key) {
            case 'samples':
              if (samples && samples.totalElements && samples.totalElements > 0) {
                result.samples.elements = samples.elements.map(s => (new Sample(s)));
              } else { result.samples = { elements: [], totalElements: 0, ids: [] }; }
              break;
            case 'reactions':
              if (reactions && reactions.totalElements && reactions.totalElements > 0) {
                result.reactions.elements = reactions.elements.map(r => (new Reaction(r)));
              } else { result.reactions = { elements: [], totalElements: 0, ids: [] }; }
              break;
            case 'wellplates':
              if (wellplates && wellplates.totalElements && wellplates.totalElements > 0) {
                result.wellplates.elements = wellplates.elements.map(s => (new Wellplate(s)));
              } else { result.wellplates = { elements: [], totalElements: 0, ids: [] }; }
              break;
            case 'screens':
              if (screens && screens.totalElements && screens.totalElements > 0) {
                result.screens.elements = screens.elements.map(s => (new Screen(s)));
              } else { result.screens = { elements: [], totalElements: 0, ids: [] }; }
              break;
            case 'research_plans':
              if (research_plans && research_plans.totalElements && research_plans.totalElements > 0) {
                result.research_plans.elements = research_plans.elements.map(s => (new ResearchPlan(s)));
              } else { result.research_plans = { elements: [], totalElements: 0, ids: [] }; }
              break;
              default:
              result[`${key}`].elements = json[`${key}`].elements.map(s => (new GenericEl(s)));
          }
        });

        return result;
      }).catch((errorMessage) => { console.log(errorMessage); });
  }
}
