import 'whatwg-fetch';
import GenericEl from 'src/models/GenericEl';
import AttachmentFetcher from 'src/fetchers/AttachmentFetcher';
import BaseFetcher from 'src/fetchers/BaseFetcher';

export default class GenericElsFetcher {
  static fetchElementKlass(klassName) {
    return fetch(`/api/v1/generic_elements/klass.json?name=${klassName}`, {
      credentials: 'same-origin'
    }).then(response => response.json()).then(json => json).catch((errorMessage) => {
      console.log(errorMessage);
    });
  }

  static fetchByCollectionId(id, queryParams = {}) {
    return BaseFetcher.fetchByCollectionId(id, queryParams, 'generic_elements', GenericEl);
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

  static uploadGenericFiles(element, id, type, hasAttach = false, isElement = false) {
    const segFiles = (element.segments || []).filter(seg => seg.files && seg.files.length > 0).length === 0;
    if (!isElement && !hasAttach && segFiles === true) return Promise.resolve(true);
    if (isElement && segFiles === true && (typeof element.files === 'undefined' || (element.files || []).length === 0)
      && (typeof element.attachments === 'undefined' || (element.attachments || []).length === 0)) return Promise.resolve(true);
    if (!isElement && hasAttach && segFiles === true && (element.attachments || []).length === 0) return Promise.resolve(true);

    const data = new FormData();
    data.append('att_id', id);
    data.append('att_type', type);

    const segMap = {};
    if (isElement === true && element.files && element.files.length > 0) {
      const elMap = {};
      elMap[id] = { type: 'ElementProps', id, files: [] };
      (element.files || []).forEach((file) => {
        data.append('elfiles[]', file.file.file, file.uid);
        elMap[id].files.push({ uid: file.uid, filename: file.file.name });
      });
      data.append('elInfo', JSON.stringify(elMap));
    }
    if (hasAttach === true && element.attachments && element.attachments.length > 0) {
      const newFiles = (element.attachments || []).filter(a => a.is_new && !a.is_deleted);
      const delFiles = (element.attachments || []).filter(a => !a.is_new && a.is_deleted);
      (newFiles || []).forEach((file) => {
          data.append('attfiles[]', file.file, file.name);
          data.append('attfilesIdentifier[]', file.id);
      });
      (delFiles || []).forEach((f) => {
        data.append('delfiles[]', f.id);
      });
    }
    (element.segments || []).forEach((segment) => {
      segMap[segment.segment_klass_id] = { type: 'SegmentProps', id, files: [] };
      (segment.files || []).forEach((file) => {
        data.append('sefiles[]', file.file.file, file.uid);
        segMap[segment.segment_klass_id].files.push({ uid: file.uid, filename: file.file.name });
      });
    });
    data.append('seInfo', JSON.stringify(segMap));
    return fetch('/api/v1/generic_elements/upload_generics_files', {
      credentials: 'same-origin',
      method: 'post',
      body: data
    }).then(response => response).catch((errorMessage) => {
      console.log(errorMessage);
    });
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
      .then(json => GenericElsFetcher.uploadGenericFiles(genericEl, json.element.id, 'Element', true, true)
        .then(() => this.fetchById(json.element.id)))
      .catch((errorMessage) => {
        console.log(errorMessage);
      });

    if (files.length > 0) {
      let tasks = [];
      files.forEach(file => tasks.push(AttachmentFetcher.uploadFile(file).then()));
      return Promise.all(tasks).then(() => {
        return promise();
      });
    }
    return promise();
  }

  static update(genericEl) {
    return this.updateOrCreate(genericEl, 'update');
  }

  static create(genericEl) {
    return this.updateOrCreate(genericEl, 'create');
  }

  static fetchElementRevisions(id) {
    return BaseFetcher.withoutBodyData({
      apiEndpoint: `/api/v1/generic_elements/element_revisions.json?id=${id}`, requestMethod: 'GET', jsonTranformation: json => json
    });
  }

  static deleteRevisions(params) {
    return BaseFetcher.withBodyData({
      apiEndpoint: '/api/v1/generic_elements/delete_revision', requestMethod: 'POST', bodyData: params, jsonTranformation: json => json
    });
  }

  static fetchSegmentRevisions(id) {
    return BaseFetcher.withoutBodyData({
      apiEndpoint: `/api/v1/generic_elements/segment_revisions.json?id=${id}`, requestMethod: 'GET', jsonTranformation: json => json
    });
  }
}
