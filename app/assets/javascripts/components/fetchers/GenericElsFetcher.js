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
    console.log(criteria);
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
      .then((response) => {
        return response.json();
      }).then((json) => {
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

  static update(genericEl) {
    const files = AttachmentFetcher.getFileListfrom(genericEl.container);
    const promise = () => fetch(`/api/v1/generic_elements/${genericEl.id}`, {
      credentials: 'same-origin',
      method: 'put',
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(genericEl.serialize())
    }).then((response) => {
      return response.json();
    }).then((json) => {
      return new GenericEl(json.element);
    }).catch((errorMessage) => {
      console.log(errorMessage);
    });

    if (files.length > 0) {
      return AttachmentFetcher.uploadFiles(files)().then(() => promise());
    }
    return promise();
  }

  static create(genericEl) {
    const files = AttachmentFetcher.getFileListfrom(genericEl.container);
    const promise = () => fetch('/api/v1/generic_elements/', {
      credentials: 'same-origin',
      method: 'post',
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(genericEl.serialize())
    }).then((response) => {
      return response.json();
    }).then((json) => {
      return new GenericEl(json.element);
    }).catch((errorMessage) => {
      console.log(errorMessage);
    });

    if (files.length > 0) {
      return AttachmentFetcher.uploadFiles(files)().then(() => promise());
    }
    return promise();
  }
}
