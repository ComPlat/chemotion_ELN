import 'whatwg-fetch';
import GenericEl from 'src/models/GenericEl';
import AttachmentFetcher from 'src/fetchers/AttachmentFetcher';
import BaseFetcher from 'src/fetchers/BaseFetcher';
import GenericBaseFetcher from './GenericBaseFetcher';

export default class GenericElsFetcher extends GenericBaseFetcher {
  static exec(path, method) {
    return super.exec(`generic_elements/${path}`, method);
  }
  static execData(params, path) {
    return super.execData(params, `generic_elements/${path}`);
  }

  static fetchByCollectionId(id, queryParams = {}, isSync = false) {
    return BaseFetcher.fetchByCollectionId(
      id,
      queryParams,
      isSync,
      'generic_elements',
      GenericEl
    );
  }

  static fetchById(id) {
    const promise = fetch(`/api/v1/generic_elements/${id}.json`, {
      credentials: 'same-origin',
    })
      .then(response => response.json())
      .then(json => {
        const genericEl = new GenericEl(json.element);
        genericEl.attachments = json.attachments;
        if (json.error) {
          genericEl.type = null; // `${id}:error:GenericEl ${id} is not accessible!`;
        }
        return genericEl;
      })
      .catch(errorMessage => {
        console.log(errorMessage);
      });
    return promise;
  }

  static uploadGenericFiles(
    element,
    id,
    type,
    hasAttach = false,
    isElement = false
  ) {
    const segFiles =
      (element.segments || []).filter(seg => seg.files && seg.files.length > 0)
        .length === 0;
    if (!isElement && !hasAttach && segFiles === true)
      return Promise.resolve(true);
    if (
      isElement &&
      segFiles === true &&
      (typeof element.files === 'undefined' ||
        (element.files || []).length === 0) &&
      (typeof element.attachments === 'undefined' ||
        (element.attachments || []).length === 0)
    )
      return Promise.resolve(true);
    if (
      !isElement &&
      hasAttach &&
      segFiles === true &&
      (element.attachments || []).length === 0
    )
      return Promise.resolve(true);

    const data = new FormData();
    data.append('att_id', id);
    data.append('att_type', type);

    const segMap = {};
    if (isElement === true && element.files && element.files.length > 0) {
      const elMap = {};
      elMap[id] = { type: 'ElementProps', id, files: [] };
      (element.files || []).forEach(file => {
        data.append('elfiles[]', file.file.file, file.uid);
        elMap[id].files.push({ uid: file.uid, filename: file.file.name });
      });
      data.append('elInfo', JSON.stringify(elMap));
    }
    if (
      hasAttach === true &&
      element.attachments &&
      element.attachments.length > 0
    ) {
      const newFiles = (element.attachments || []).filter(
        a => a.is_new && !a.is_deleted
      );
      const delFiles = (element.attachments || []).filter(
        a => !a.is_new && a.is_deleted
      );
      (newFiles || []).forEach(file => {
        data.append('attfiles[]', file.file, file.name);
        data.append('attfilesIdentifier[]', file.id); // TODO: check if this is needed
      });
      (delFiles || []).forEach(f => {
        data.append('delfiles[]', f.id);
      });
    }
    (element.segments || []).forEach(segment => {
      segMap[segment.segment_klass_id] = {
        type: 'SegmentProps',
        id,
        files: [],
      };
      (segment.files || []).forEach(file => {
        data.append('sefiles[]', file.file.file, file.uid);
        segMap[segment.segment_klass_id].files.push({
          uid: file.uid,
          filename: file.file.name,
        });
      });
    });
    data.append('seInfo', JSON.stringify(segMap));
    return fetch('/api/v1/generic_elements/upload_generics_files', {
      credentials: 'same-origin',
      method: 'post',
      body: data,
    })
      .then(response => response)
      .catch(errorMessage => {
        console.log(errorMessage);
      });
  }

  static updateOrCreate(genericEl, action = 'create') {
    const files = AttachmentFetcher.getFileListfrom(genericEl.container);
    const method = action === 'create' ? 'post' : 'put';
    const api =
      action === 'create'
        ? '/api/v1/generic_elements/'
        : `/api/v1/generic_elements/${genericEl.id}`;
    const promise = () =>
      fetch(api, {
        credentials: 'same-origin',
        method,
        headers: {
          Accept: 'application/json',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(genericEl.serialize()),
      })
        .then(response => response.json())
        .then(json =>
          GenericElsFetcher.uploadGenericFiles(
            genericEl,
            json.element.id,
            'Element',
            true,
            true
          ).then(() => this.fetchById(json.element.id))
        )
        .catch(errorMessage => {
          console.log(errorMessage);
        });

    if (files.length > 0) {
      let tasks = [];
      files.forEach(file =>
        tasks.push(AttachmentFetcher.uploadFile(file).then())
      );
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

  static createElementKlass(params) {
    return this.execData(params, 'create_element_klass');
  }

  static fetchElementRevisions(id) {
    return this.exec(`element_revisions.json?id=${id}`, 'GET');
  }

  static fetchElementKlasses() {
    return this.exec('klasses_all.json', 'GET');
  }

  static fetchElementKlass(klassName) {
    return this.exec(`klass.json?name=${klassName}`, 'GET');
  }

  static deleteRevisions(params) {
    return this.execData(params, 'delete_revision');
  }

  static updateElementKlass(params) {
    return this.execData(params, 'update_element_klass');
  }

  static updateElementTemplate(params) {
    return super.updateTemplate(
      { ...params, klass: 'ElementKlass' },
      'update_element_template'
    );
  }

  static fetchRepo() {
    return this.exec('fetch_repo', 'GET');
  }

  static createRepo(params) {
    return this.execData(params, 'create_repo_klass');
  }
}
