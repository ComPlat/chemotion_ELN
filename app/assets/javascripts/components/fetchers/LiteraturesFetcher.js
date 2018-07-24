import 'whatwg-fetch';
import Immutable from 'immutable';
import Literature from '../models/Literature';

export default class LiteraturesFetcher {
  static fetchElementReferences(element) {
    const { type, id } = element;
    return fetch(`/api/v1/literatures?element_type=${type}&element_id=${id}`, {
      credentials: 'same-origin'
    }).then(response => response.json())
      .then(json => json.literatures)
      .then(literatures => literatures.map(literature => new Literature(literature)))
      .then(literatures => Immutable.List(literatures))
      .catch((errorMessage) => { console.log(errorMessage); });
  }

  static postElementReference(params) {
    const { element, literature } = params;
    const { type, id } = element;
    return fetch('/api/v1/literatures', {
      credentials: 'same-origin',
      method: 'post',
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ element_type: type, element_id: id, ref: literature })
    }).then(response => response.json())
      .then(json => json.literatures)
      .then(literatures => literatures.map(literature => new Literature(literature)))
      .then(literatures => Immutable.List(literatures))
      .catch((errorMessage) => { console.log(errorMessage); });
  }

  static deleteElementReference(params) {
    const { element, literature } = params;
    const { type, id } = element;
    const ref_id = literature.id;
    return fetch(`/api/v1/literatures?id=${ref_id}&element_type=${type}&element_id=${id}`, {
      credentials: 'same-origin',
      method: 'delete',
      headers: {
        'Accept': 'application/json',
      },
    }).then(response => response.json())
      .then(json => json.literatures)
      .then(literatures => literatures.map(literature => new Literature(literature)))
      .then(literatures => Immutable.List(literatures))
      .catch((errorMessage) => { console.log(errorMessage); });
  }

  static fetchDOIMetadata(doi) {
    return fetch(`/api/v1/literatures/doi/metadata?doi=${encodeURIComponent(doi)}`, {
      credentials: 'same-origin',
    }).then(response => response.json())
      .catch((errorMessage) => { console.log(errorMessage); });
  }
}
