import 'whatwg-fetch';
import Sample from 'src/models/Sample';
import Reaction from 'src/models/Reaction';
import Wellplate from 'src/models/Wellplate';
import CellLine from 'src/models/cellLine/CellLine';
import Screen from 'src/models/Screen';
import GenericEl from 'src/models/GenericEl';
import ResearchPlan from 'src/models/ResearchPlan';
import SequenceBasedMacromoleculeSample from 'src/models/SequenceBasedMacromoleculeSample';

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
        const result = { ...json };
        return this.getResultByKey(result);
      }).catch((errorMessage) => { console.log(errorMessage); });
  }

  static fetchBasedOnSearchResultIds(params) {
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
        page_size: selection.page_size,
        per_page: selection.page_size,
        is_sync: isSync || false,
        molecule_sort: moleculeSort || false,
        is_public: isPublic || false,
      })
    }).then(response => response.json())
      .then((json) => {
        const result = { ...json };
        return this.getResultByKey(result);
      }).catch((errorMessage) => { console.log(errorMessage); });
  }

  static getResultByKey(result) {
    const { samples, reactions, wellplates, screens, research_plans, sequence_based_macromolecule_samples } = result;

    Object.keys(result).forEach((key) => {
      switch (key) {
        case 'samples':
          if (samples && samples.elements.length > 0) {
            result.samples.elements = samples.elements.map(s => (new Sample(s)));
          } else { result.samples = { elements: [], ids: [], totalElements: 0 }; }
          break;
        case 'reactions':
          if (reactions && reactions.elements.length > 0) {
            result.reactions.elements = reactions.elements.map(r => (new Reaction(r)));
          } else { result.reactions = { elements: [], totalElements: 0, ids: [] }; }
          break;
        case 'wellplates':
          if (wellplates && wellplates.elements.length > 0) {
            result.wellplates.elements = wellplates.elements.map(s => (new Wellplate(s)));
          } else { result.wellplates = { elements: [], totalElements: 0, ids: [] }; }
          break;
        case 'screens':
          if (screens && screens.elements.length > 0) {
            result.screens.elements = screens.elements.map(s => (new Screen(s)));
          } else { result.screens = { elements: [], totalElements: 0, ids: [] }; }
          break;
        case 'research_plans':
          if (research_plans && research_plans.elements.length > 0) {
            result.research_plans.elements = research_plans.elements.map(s => (new ResearchPlan(s)));
          } else { result.research_plans = { elements: [], totalElements: 0, ids: [] }; }
          break;
        case 'sequence_based_macromolecule_samples':
          if (sequence_based_macromolecule_samples && sequence_based_macromolecule_samples.elements.length > 0) {
            result.sequence_based_macromolecule_samples.elements =
              sequence_based_macromolecule_samples.elements.map(s => (new SequenceBasedMacromoleculeSample(s)));
          } else { result.sequence_based_macromolecule_samples = { elements: [], totalElements: 0, ids: [] }; }
          break;
        default:
          if (result[`${key}`] && result[`${key}`].elements !== undefined && result[`${key}`].elements.length > 0) {
            result[`${key}`].elements = result[`${key}`].elements.map(s => (new GenericEl(s)));
          } else { result[`${key}`] = { elements: [], totalElements: 0, ids: [] }; }
          break;
      }
    });
    return result;
  }
}
