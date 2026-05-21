import ApiClient from 'src/api_clients/ChemotionApiClient';
import { List, Map } from 'immutable';
import Literature from 'src/models/Literature';

export default class LiteraturesFetcher {
  static fetchElementReferences(element) {
    if (!element || element.isNew) {
      return Promise.resolve(List());
    }
    const { type, id } = element;
    return ApiClient.getJson(`/api/v1/literatures?element_type=${type}&element_id=${id}`)
      .then((json) => json.literatures)
      .then((literatures) => literatures.map((literature) => new Literature(literature)))
      .then((lits) => lits.reduce((acc, l) => acc.set(l.literal_id, l), new Map()));
  }

  static postElementReference(params) {
    const { element, literature } = params;
    const { type, id } = element;
    if (!element || element.isNew) {
      return Promise.resolve(List());
    }
    return ApiClient.postJson('/api/v1/literatures', { body: { element_type: type, element_id: id, ref: literature } })
      .then((json) => { if (json.error) { throw json; } return json.literatures; })
      .then((literatures) => literatures.map((lits) => new Literature(lits)))
      .then((lits) => lits.reduce((acc, l) => acc.set(l.literal_id, l), new Map()));
  }

  static deleteElementReference(params) {
    const { element, literature } = params;
    const { type, id } = element;
    const refId = literature.literal_id;

    const urlParams = new URLSearchParams({
      id: refId,
      element_type: type,
      element_id: id
    });

    return ApiClient.deleteRequest(`/api/v1/literatures?${urlParams}`)
      .then((json) => { if (json.error) { throw json; } });
  }

  static updateReferenceType(params) {
    return ApiClient.putJson('/api/v1/literatures', { body: params })
      .then((json) => { if (json.error) { throw json; } return json.literatures; })
      .then((literatures) => literatures.map((lits) => new Literature(lits)))
      .then((lits) => lits.reduce((acc, l) => acc.set(l.literal_id, l), new Map()));
  }

  static fetchDOIMetadata(doi) {
    return ApiClient.getJson(`/api/v1/literatures/doi/metadata?doi=${encodeURIComponent(doi)}`);
  }

  static fetchReferencesByCollection(params) {
    return ApiClient.getJson(`/api/v1/literatures/collection?id=${params.id}`)
      .then((json) => {
        const {
          collectionRefs,
          sampleRefs,
          reactionRefs,
          researchPlanRefs,
        } = json;
        return {
          collectionRefs: List(collectionRefs.map((lit) => new Literature(lit))),
          sampleRefs: List(sampleRefs.map((lit) => new Literature(lit))),
          reactionRefs: List(reactionRefs.map((lit) => new Literature(lit))),
          researchPlanRefs: List(researchPlanRefs.map((lit) => new Literature(lit))),
        };
      });
  }

  static postReferencesByUIState(params) {
    return ApiClient.postJson('/api/v1/literatures/ui_state', { body: params })
      .then((json) => json.selectedRefs.map((lit) => new Literature(lit)))
      .then((lits) => lits.reduce((acc, l) => acc.set(l.literal_id, l), new Map()));
  }
}
