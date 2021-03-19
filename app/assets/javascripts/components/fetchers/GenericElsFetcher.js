import 'whatwg-fetch';
import { differenceBy, concat } from 'lodash';
import GenericEl from '../models/GenericEl';
import Sample from '../models/Sample';
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

  static fetchById(id) {
    const promise = fetch(`/api/v1/generic_elements/${id}.json`, {
      credentials: 'same-origin'
    })
      .then(response => response.json()).then((json) => {
        const genericEl = new GenericEl(json.element);
        genericEl.attachments = json.attachments;
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
    const newFiles = (genericEl.attachments || []).filter(a => a.is_new && !a.is_deleted);
    const delFiles = (genericEl.attachments || []).filter(a => !a.is_new && a.is_deleted);
    const files = AttachmentFetcher.getFileListfrom(genericEl.container);
    const method = action === 'create' ? 'post' : 'put';
    const api = action === 'create' ? '/api/v1/generic_elements/' : `/api/v1/generic_elements/${genericEl.id}`;
    const promise = () => fetch(api, {
      credentials: 'same-origin',
      method,
      headers: { Accept: 'application/json', 'Content-Type': 'application/json' },
      body: JSON.stringify(genericEl.serialize())
    }).then(response => response.json())
      .then((json) => {
        if (newFiles.length <= 0 && delFiles.length <= 0) { return new GenericEl(json.element); }
        return AttachmentFetcher.updateAttachables(newFiles, 'Element', json.element.id, delFiles)()
          .then(() => {
            const result = differenceBy(json.element.attachments, delFiles, 'id');
            const newEl = new GenericEl(json.element);
            newEl.attachments = concat(result, newFiles);
            return new GenericEl(newEl);
          });
      })
      .catch((errorMessage) => {
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
