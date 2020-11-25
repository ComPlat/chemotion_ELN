import 'whatwg-fetch';
import GenericEl from '../models/GenericEl';
import AttachmentFetcher from './AttachmentFetcher';
import BaseFetcher from './BaseFetcher';

export default class GenericElsFetcher {
  static fetchElementKlass(klassName) {
    return fetch(`/api/v1/generic_elements/klass.json?name=${klassName}`, {
      credentials: 'same-origin'
    }).then(response => response.json()).then(json => json).catch((errorMessage) => {
      console.log(errorMessage);
    });
  }

  static fetchByCollectionId(id, queryParams = {}, isSync = false) {
    return BaseFetcher.fetchByCollectionId(id, queryParams, isSync, 'generic_elements', GenericEl);
  }

  static search(criteria) {
    const promise = () => fetch('/api/v1/generic_elements/search/', {
      credentials: 'same-origin',
      method: 'post',
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(criteria)
    }).then(response => (response.json())
      .then((json) => {
        const result = { ...json };
        result[`${criteria.genericElName}s`].elements = result[`${criteria.genericElName}s`].elements.map(r => (new GenericEl(r)));
        return result;
      }))
      .catch((errorMessage) => { console.log(errorMessage); });
    return promise();
  }

  static fetchById(id) {
    const promise = fetch(`/api/v1/generic_elements/${id}.json`, {
      credentials: 'same-origin'
    })
      .then(response => response.json()).then((json) => {
        const genericEl = new GenericEl(json.element);
        if (json.error) {
          genericEl.type = null; // `${id}:error:GenericEl ${id} is not accessible!`;
        }
        return genericEl;
      }).catch((errorMessage) => {
        console.log(errorMessage);
      });
    return promise;
  }

  static updateOrCreate(genericEl, action = 'create') {
    const files = AttachmentFetcher.getFileListfrom(genericEl.container);
    const method = action === 'create' ? 'post' : 'put';
    const api = action === 'create' ? '/api/v1/generic_elements/' : `/api/v1/generic_elements/${genericEl.id}`;
    const promise = () => fetch(api, {
      credentials: 'same-origin',
      method,
      headers: { Accept: 'application/json', 'Content-Type': 'application/json' },
      body: JSON.stringify(genericEl.serialize())
    }).then(response => response.json())
      .then(json => new GenericEl(json.element)).catch((errorMessage) => {
        console.log(errorMessage);
      });
    if (files.length > 0) return AttachmentFetcher.uploadFiles(files)().then(() => promise());
    return promise();
  }

  static update(genericEl) {
    return this.updateOrCreate(genericEl, 'update');
  }

  static create(genericEl) {
    return this.updateOrCreate(genericEl, 'create');
  }
}
