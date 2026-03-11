import 'whatwg-fetch';
import GenericEl from 'src/models/GenericEl';
import AttachmentFetcher from 'src/fetchers/AttachmentFetcher';
import BaseFetcher from 'src/fetchers/BaseFetcher';
import GenericBaseFetcher from 'src/fetchers/GenericBaseFetcher';
import { getFileName, downloadBlob } from 'src/utilities/FetcherHelper';

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

  static export(element, klass, exportFormat) {
    let fileName;
    const api = `/api/v1/generic_elements/export.json?id=${element.id}&klass=${klass}&export_format=${exportFormat}`;
    const promise = fetch(api, {
      credentials: 'same-origin',
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json'
      }
    }).then((response) => {
      if (response.ok) {
        fileName = getFileName(response);
        return response.blob();
      }
    }).then((blob) => {
      downloadBlob(fileName, blob);
    }).catch((errorMessage) => {
      console.log(errorMessage);
    });
    return promise;
  }

  static fetchById(id) {
    const promise = fetch(`/api/v1/generic_elements/${id}.json`, {
      credentials: 'same-origin',
    })
      .then((response) => response.json())
      .then((json) => {
        const genericEl = new GenericEl(json.element);
        genericEl.attachments = json.attachments;
        if (json.error) {
          genericEl.type = null;
        }
        // Fetch wellplates for this element
        return this.fetchWellplates(id).then((wellplatesData) => {
          genericEl.wellplates = wellplatesData?.wellplates || [];
          return genericEl;
        });
      })
      .catch((errorMessage) => {
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
    const segFiles = (element.segments || []).filter(
      (seg) => seg.files && seg.files.length > 0
    ).length === 0;
    if (!isElement && !hasAttach && segFiles === true) {
      return Promise.resolve(true);
    }
    if (
      isElement
      && segFiles === true
      && (typeof element.files === 'undefined'
        || (element.files || []).length === 0)
      && (typeof element.attachments === 'undefined'
        || (element.attachments || []).length === 0)
    ) {
      return Promise.resolve(true);
    }
    if (
      !isElement
      && hasAttach
      && segFiles === true
      && (element.attachments || []).length === 0
    ) {
      return Promise.resolve(true);
    }

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

    if (GenericElsFetcher.shouldUploadAttachments(hasAttach, element)) {
      GenericElsFetcher.prepareAttachmentParam(element, data);
    }

    (element.segments || []).forEach((segment) => {
      segMap[segment.segment_klass_id] = {
        type: 'SegmentProps',
        id,
        files: [],
      };
      (segment.files || []).forEach((file) => {
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
      .then((response) => response)
      .catch((errorMessage) => {
        console.log(errorMessage);
      });
  }

  static updateOrCreate(genericEl, action = 'create') {
    const method = action === 'create' ? 'post' : 'put';
    const api = action === 'create'
      ? '/api/v1/generic_elements/'
      : `/api/v1/generic_elements/${genericEl.id}`;
    const promise = () => fetch(api, {
      credentials: 'same-origin',
      method,
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(genericEl.serialize()),
    })
      .then((response) => response.json())
      .then((json) => GenericElsFetcher.uploadGenericFiles(
        genericEl,
        json.element.id,
        'Element',
        true,
        true
      ).then(() => this.updateWellplates(json.element.id, genericEl.wellplateIDs || []))
        .then(() => this.fetchById(json.element.id)))
      .catch((errorMessage) => {
        console.log(errorMessage);
      });
    return AttachmentFetcher.uploadNewAttachmentsForContainer(genericEl.container).then(() => promise());
  }

  static update(genericEl) {
    return this.updateOrCreate(genericEl, 'update');
  }

  static create(genericEl) {
    return this.updateOrCreate(genericEl, 'create');
  }

  static split(params, name) {
    const data = {
      ui_state: {
        element: {
          all: params[name].checkedAll,
          included_ids: params[name].checkedIds,
          excluded_ids: params[name].uncheckedIds,
          name
        },
        currentCollectionId: params.currentCollection.id
      }
    };
    return this.execData(data, 'split');
  }

  static createElementKlass(params) {
    return this.execData(params, 'create_element_klass');
  }

  static fetchElementKlasses() {
    return this.exec('klasses_all.json', 'GET');
  }

  static fetchElementKlass(klassName) {
    return this.exec(`klass.json?name=${klassName}`, 'GET');
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

  static prepareAttachmentParam(element, data) {
    const newFiles = (element.attachments || []).filter(
      (a) => a.is_new && !a.is_deleted
    );
    const delFiles = (element.attachments || []).filter(
      (a) => !a.is_new && a.is_deleted
    );
    (newFiles || []).forEach((file) => {
      data.append('attfiles[]', file.file, file.name);
      data.append('attfilesIdentifier[]', file.id);
    });
    (delFiles || []).forEach((f) => {
      data.append('delfiles[]', f.id);
    });
  }

  static shouldUploadAttachments(hasAttach, element) {
    return hasAttach === true
      && element.attachments
      && element.attachments.length > 0
      && element.type !== 'research_plan';
  }

  static uploadKlass(params) {
    return this.execData(params, 'upload_klass');
  }

  static fetchWellplates(elementId) {
    return super.exec(`wellplates/by_generic_element/${elementId}`, 'GET');
  }

  static updateWellplates(elementId, wellplateIds) {
    return super.execData({ wellplate_ids: wellplateIds }, `wellplates/by_generic_element/${elementId}`, 'PUT');
  }

  static getMttRequest(params) {
    const api = '/api/v1/mtt/requests';
    const promise = () => fetch(api, {
      credentials: 'same-origin',
      method: 'get',
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
      },
    })
      .then((response) => response.json())
      .catch((errorMessage) => {
        console.log(errorMessage);
      });
    return promise();
  }

  static sendMttRequest(params) {
    console.log('Sending MTT request with params:', params);
    const api = '/api/v1/mtt/create_mtt_request';
    const promise = () => fetch(api, {
      credentials: 'same-origin',
      method: 'post',
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(params),
    })
      .then((response) => response.json())
      .catch((errorMessage) => {
        console.log(errorMessage);
      });
    return promise();
  }
}
