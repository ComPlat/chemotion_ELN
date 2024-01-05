import 'whatwg-fetch';
import Sample from 'src/models/Sample';
import Reaction from 'src/models/Reaction';
import Wellplate from 'src/models/Wellplate';
import CellLine from 'src/models/cellLine/CellLine';
import Screen from 'src/models/Screen';
import GenericEl from 'src/models/GenericEl';
import ResearchPlan from 'src/models/ResearchPlan';

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
        const { samples, reactions, wellplates, screens, research_plans, cell_lines } = json;
        const result = { ...json };

        Object.keys(json).forEach((key) => {
          switch (key) {
            case 'samples':
              if (samples && samples.totalElements && samples.totalElements > 0) {
                result.samples.elements = samples.elements.map(s => (new Sample(s)));
              } else { result.samples = { elements: [], totalElements: 0, ids: [], error: result.samples.error }; }
              break;
            case 'reactions':
              if (reactions && reactions.totalElements && reactions.totalElements > 0) {
                result.reactions.elements = reactions.elements.map(r => (new Reaction(r)));
              } else { result.reactions = { elements: [], totalElements: 0, ids: [], error: result.reactions.error }; }
              break;
            case 'wellplates':
              if (wellplates && wellplates.totalElements && wellplates.totalElements > 0) {
                result.wellplates.elements = wellplates.elements.map(s => (new Wellplate(s)));
              } else { result.wellplates = { elements: [], totalElements: 0, ids: [], error: result.wellplates.error }; }
              break;
            case 'screens':
              if (screens && screens.totalElements && screens.totalElements > 0) {
                result.screens.elements = screens.elements.map(s => (new Screen(s)));
              } else { result.screens = { elements: [], totalElements: 0, ids: [], error: result.screens.error }; }
              break;
            case 'research_plans':
              if (research_plans && research_plans.totalElements && research_plans.totalElements > 0) {
                result.research_plans.elements = research_plans.elements.map(s => (new ResearchPlan(s)));
              } else { result.research_plans = { elements: [], totalElements: 0, ids: [], error: result.research_plans.error }; }
              break;
            case 'cell_lines':
              if (cell_lines && cell_lines.totalElements && cell_lines.totalElements > 0) {
                result.cell_lines.elements = cell_lines.elements.map(s => (CellLine.createFromRestResponse(0, s)));
              } else { result.cell_lines = { elements: [], totalElements: 0, ids: [] }; }
              break;
            default:
              result[`${key}`].elements = json[`${key}`].elements.map(s => (new GenericEl(s)));
          }
        });

        return result;
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
        const { samples, reactions, wellplates, screens, research_plans } = json;
        const result = { ...json };

        Object.keys(json).forEach((key) => {
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
            default:
              if (json[`${key}`] && json[`${key}`].elements !== undefined && json[`${key}`].elements.length > 0) {
                result[`${key}`].elements = json[`${key}`].elements.map(s => (new GenericEl(s)));
              } else { result[`${key}`] = { elements: [], totalElements: 0, ids: [] }; }
              break;
          }
        });

        return result;
      }).catch((errorMessage) => { console.log(errorMessage); });
  }
}
