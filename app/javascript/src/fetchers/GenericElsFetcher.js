import ApiClient from 'src/api_clients/ChemotionApiClient';
import GenericEl from 'src/models/GenericEl';
import AttachmentFetcher from 'src/fetchers/AttachmentFetcher';
import GenericBaseFetcher from 'src/fetchers/GenericBaseFetcher';
import UserStore from 'src/stores/alt/stores/UserStore';
import { getFileName, downloadBlob, preparedCollectionParams } from 'src/utilities/FetcherHelper';
import { normalizeMttResult } from 'src/utilities/mttDataProcessor';

export default class GenericElsFetcher extends GenericBaseFetcher {
  static fetchByCollectionId(id, params = {}) {
    const searchParams = this.genericElsSearchParams(params);

    return ApiClient.getJson(`/api/v1/generic_elements?${preparedCollectionParams(id, searchParams)}`, {
      handleResponseSuccess: (response) => response.json()
        .then((json) => ({
          elements: json.generic_elements.map((element) => (new GenericEl(element))),
          totalElements: parseInt(response.headers.get('X-Total'), 10),
          page: parseInt(response.headers.get('X-Page'), 10),
          pages: parseInt(response.headers.get('X-Total-Pages'), 10),
          perPage: parseInt(response.headers.get('X-Per-Page'), 10)
        })),
    });
  }

  static genericElsSearchParams(params) {
    const userState = UserStore.getState();
    const filters = userState?.profile?.data?.filters || {};
    const group = filters[params.name]?.group || 'none';
    const sort = filters[params.name]?.sort || false;
    return { ...params, el_type: params.name, sort_column: (sort && group) || 'updated_at' };
  }

  static export(element, klass, exportFormat) {
    let fileName;
    const searchParams = new URLSearchParams({ id: element.id, klass, export_format: exportFormat });
    return ApiClient.getJson(`/api/v1/generic_elements/export?${searchParams}`, {
      handleResponseSuccess: (response) => {
        if (response.ok) {
          fileName = getFileName(response);
          return response.blob();
        }
        throw Error(response.statusText);
      }
    })
      .then((blob) => {
        downloadBlob(fileName, blob);
      });
  }

  static fetchById(id) {
    return ApiClient.getJson(`/api/v1/generic_elements/${id}`)
      .then((json) => this.genericElement(json, id))
      .then((genericEl) => this.fetchWellplates(id).then((wellplatesData) => {
        genericEl.wellplates = wellplatesData?.wellplates || [];
        return genericEl;
      }));
  }

  static uploadGenericFiles(element, id, type, hasAttach = false, isElement = false) {
    if (!this.canUploadGenericFiles(element, isElement, hasAttach)) {
      return Promise.resolve(true);
    }

    const data = this.prepareUploadData(element, id, type, isElement, hasAttach);
    return ApiClient.postFormData('/api/v1/generic_elements/upload_generics_files', { body: data });
  }

  static create(genericEl) {
    return AttachmentFetcher.uploadNewAttachmentsForContainer(genericEl.container)
      .then(() => ApiClient.postJson('/api/v1/generic_elements', { body: genericEl.serialize() }))
      .then((json) => {
        const { id } = json.element;
        return this.uploadGenericFiles(genericEl, id, 'Element', true, true)
          .then(() => this.updateWellplates(id, genericEl.wellplateIDs || []))
          .then(() => this.fetchById(id));
      });
  }

  static update(genericEl) {
    const tasks = [
      AttachmentFetcher.uploadNewAttachmentsForContainer(genericEl.container),
      this.uploadGenericFiles(genericEl, genericEl.id, 'Element', true, true),
    ];

    return Promise.all(tasks)
      .then(() => ApiClient.putJson(`/api/v1/generic_elements/${genericEl.id}`, { body: genericEl.serialize() }))
      .then(() => this.updateWellplates(genericEl.id, genericEl.wellplateIDs || []))
      .then(() => this.fetchById(genericEl.id));
  }

  static split(params, name) {
    const body = {
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
    return ApiClient.postJson('/api/v1/generic_elements/split', { body });
  }

  static createElementKlass(params) {
    return ApiClient.postJson('/api/v1/generic_elements/create_element_klass', { body: params });
  }

  static fetchElementKlasses() {
    return ApiClient.getJson('/api/v1/generic_elements/klasses_all');
  }

  static fetchElementKlass(klassName) {
    return ApiClient.getJson(`/api/v1/generic_elements/klass?name=${klassName}`);
  }

  static updateElementKlass(params) {
    return ApiClient.postJson('/api/v1/generic_elements/update_element_klass', { body: params });
  }

  static updateElementTemplate(params) {
    return ApiClient.postJson('/api/v1/generic_elements/update_template', {
      body: { ...params, klass: 'ElementKlass' }
    });
  }

  static fetchRepo() {
    return ApiClient.getJson('/api/v1/generic_elements/fetch_repo');
  }

  static createRepo(params) {
    return ApiClient.postJson('/api/v1/generic_elements/create_repo_klass', { body: params });
  }

  static uploadKlass(params) {
    return ApiClient.postJson('/api/v1/generic_elements/upload_klass', { body: params });
  }

  static canUploadGenericFiles(element, isElement, hasAttach) {
    let uploadable = true;
    const segFiles = (element.segments || []).filter(
      (seg) => seg.files && seg.files.length > 0
    ).length === 0;

    if (!isElement && !hasAttach && segFiles === true) {
      uploadable = false;
    }
    if (
      isElement
      && segFiles === true
      && (typeof element.files === 'undefined'
        || (element.files || []).length === 0)
      && (typeof element.attachments === 'undefined'
        || (element.attachments || []).length === 0)
    ) {
      uploadable = false;
    }
    if (
      !isElement
      && hasAttach
      && segFiles === true
      && (element.attachments || []).length === 0
    ) {
      uploadable = false;
    }
    return uploadable;
  }

  static prepareUploadData(element, id, type, isElement, hasAttach) {
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

    if (this.shouldUploadAttachments(hasAttach, element)) {
      this.prepareAttachmentParam(element, data);
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
    return data;
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

  static genericElement(json, id) {
    if (json.error) {
      return new GenericEl({ id: `${id}:error:GenericEl ${id} is not accessible!` });
    }
    const genericEl = new GenericEl(json.element);
    genericEl.attachments = json.attachments;
    return genericEl;
  }

  static fetchWellplates(elementId) {
    return ApiClient.getJson(`/api/v1/wellplates/by_generic_element/${elementId}`);
  }

  static updateWellplates(elementId, wellplateIds) {
    return ApiClient.putJson(`/api/v1/wellplates/by_generic_element/${elementId}`, {
      body: { wellplate_ids: wellplateIds },
    });
  }

  static getMttRequest(params) {
    const searchParams = new URLSearchParams(params);
    return ApiClient.getJson(`/api/v1/mtt/requests?${searchParams}`);
  }

  static sendMttRequest(params) {
    return ApiClient.postJson('/api/v1/mtt/create_mtt_request', { body: params });
  }

  static deleteMttRequests(ids) {
    return ApiClient.deleteRequest('/api/v1/mtt/requests', { body: { ids } });
  }

  static deleteMttResult(outputId, sampleName) {
    return ApiClient.deleteRequest(`/api/v1/mtt/outputs/${outputId}/results`, {
      body: { sample_name: sampleName },
    });
  }

  static sendMttResultsToSample(selections, genericElementId, assayInfo = {}) {
    const timestamp = new Date().toISOString().slice(0, 16).replace('T', ' ');

    const raw_data = selections.map((selection) => ({
      uuid: `mtt-${selection.output_id}-${crypto.randomUUID()}`,
      sample_identifier: selection.sample_name,
      description: `MTT Analysis (${timestamp})`,
      value: normalizeMttResult(selection.result_data).icRelative || 0,
      unit: '',
      metadata: {
        analysis_type: 'mtt_output',
        generic_element_id: genericElementId,
        element_klass_label: assayInfo.element_klass_label || '',
        element_short_label: assayInfo.element_short_label || '',
        element_name: assayInfo.element_name || '',
        analysis_timestamp: timestamp,
        results: [selection.result_data]
      }
    }));

    return ApiClient.postJson('/api/v1/measurements/bulk_create_from_raw_data', {
      body: {
        raw_data,
        source_type: 'Labimotion::Element',
        source_id: genericElementId,
      },
    });
  }
}
