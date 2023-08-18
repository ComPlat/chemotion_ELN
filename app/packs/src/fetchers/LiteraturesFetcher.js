import 'whatwg-fetch';
import Immutable from 'immutable';
import Literature from 'src/models/Literature';

export default class LiteraturesFetcher {
  static fetchElementReferences(element) {
    if (!element || element.isNew) {
      return Promise.resolve(Immutable.List())
    }
    const { type, id } = element;
    return fetch(`/api/v1/literatures?element_type=${type}&element_id=${id}`, {
      credentials: 'same-origin'
    }).then(response => response.json())
      .then(json => json.literatures)
      .then(literatures => literatures.map(literature => new Literature(literature)))
      .then(lits => lits.reduce((acc, l) => acc.set(l.literal_id, l), new Immutable.Map()))
      .catch((errorMessage) => { console.log(errorMessage); });
  }

  static postElementReference(params) {
    const { element, literature } = params;
    const { type, id } = element;
    if (!element || element.isNew) {
      return Promise.resolve(Immutable.List())
    }
    return fetch('/api/v1/literatures', {
      credentials: 'same-origin',
      method: 'post',
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ element_type: type, element_id: id, ref: literature })
    }).then(response => response.json())
      .then((json) => { if (json.error) { throw json; } return json.literatures; })
      .then(literatures => literatures.map(lits => new Literature(lits)))
      .then(lits => lits.reduce((acc, l) => acc.set(l.literal_id, l), new Immutable.Map()))
      .catch((errorMessage) => { console.log(errorMessage); throw errorMessage; });
  }

  static deleteElementReference(params) {
    const { element, literature } = params;
    const { type, id } = element;
    const refId = literature.literal_id;
    return fetch(`/api/v1/literatures?id=${refId}&element_type=${type}&element_id=${id}`, {
      credentials: 'same-origin',
      method: 'delete',
      headers: {
        Accept: 'application/json',
      },
    }).then(response => response.json())
      .then((json) => { if (json.error) { throw json; } })
      .catch((errorMessage) => { throw errorMessage; });
  }

  static updateReferenceType(params) {
    return fetch('/api/v1/literatures', {
      credentials: 'same-origin',
      method: 'put',
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(params)
    }).then(response => response.json())
      .then((json) => { if (json.error) { throw json; } return json.literatures; })
      .then(literatures => literatures.map(lits => new Literature(lits)))
      .then(lits => lits.reduce((acc, l) => acc.set(l.literal_id, l), new Immutable.Map()))
      .catch((errorMessage) => { console.log(errorMessage); throw errorMessage; });
  }

  static fetchDOIMetadata(doi) {
    return fetch(`/api/v1/literatures/doi/metadata?doi=${encodeURIComponent(doi)}`, {
      credentials: 'same-origin',
    }).then(response => response.json())
      .catch((errorMessage) => { console.log(errorMessage); });
  }

  static fetchReferencesByCollection(params) {
    return fetch(`/api/v1/literatures/collection?id=${params.id}`, {
      credentials: 'same-origin',
    }).then(response => response.json())
      .then((json) => {
        const {
          collectionRefs,
          sampleRefs,
          reactionRefs,
          researchPlanRefs,
        } = json;
        return {
          collectionRefs: Immutable.List(collectionRefs.map(lit => new Literature(lit))),
          sampleRefs: Immutable.List(sampleRefs.map(lit => new Literature(lit))),
          reactionRefs: Immutable.List(reactionRefs.map(lit => new Literature(lit))),
          researchPlanRefs: Immutable.List(researchPlanRefs.map(lit => new Literature(lit))),
        };
      })
      .catch((errorMessage) => { console.log(errorMessage); });
  }

  static postReferencesByUIState(params, method = 'post') {
    return fetch(`/api/v1/literatures/ui_state`, {
      credentials: 'same-origin',
      method,
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(params)
    }).then(response => response.json())
      .then(json => json.selectedRefs.map(lit => new Literature(lit)))
      .then(lits => lits.reduce((acc, l) => acc.set(l.literal_id, l), new Immutable.Map()))
      .catch((errorMessage) => { console.log(errorMessage); });
  }
}
