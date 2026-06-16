import ApiClient from 'src/api_clients/ChemotionApiClient';
import SequenceBasedMacromoleculeSample from 'src/models/SequenceBasedMacromoleculeSample';
import AttachmentFetcher from 'src/fetchers/AttachmentFetcher';
import AnnotationsFetcher from 'src/fetchers/AnnotationsFetcher';
import { preparedCollectionParams } from 'src/utilities/FetcherHelper';
import { dateToUnixTimestamp } from 'src/utilities/timezoneHelper';

export default class SequenceBasedMacromoleculeSamplesFetcher {
  static fetchByCollectionId(id, params = {}, listOrder = 'sbmm') {
    const searchParams = this.sbmmSampleSearchParams(id, params, listOrder);

    return ApiClient.getJson(`/api/v1/sequence_based_macromolecule_samples?${searchParams}`, {
      handleResponseSuccess: (response) => response.json()
        .then((json) => ({
          elements: json.sequence_based_macromolecule_samples
            .map((sbmmSample) => new SequenceBasedMacromoleculeSample(sbmmSample)),
          totalElements: parseInt(response.headers.get('X-Total'), 10),
          page: parseInt(response.headers.get('X-Page'), 10),
          pages: parseInt(response.headers.get('X-Total-Pages'), 10),
          perPage: parseInt(response.headers.get('X-Per-Page'), 10)
        })),
    });
  }

  static sbmmSampleSearchParams(id, params, listOrder) {
    // eslint-disable-next-line object-curly-newline
    const { fromDate, toDate, filterCreatedAt, ...restParams } = params;

    const searchParams = preparedCollectionParams(id, { ...restParams, listOrder });
    searchParams.set('filter[timestamp_field]', filterCreatedAt ? 'created_at' : 'updated_at');
    if (fromDate) searchParams.set('filter[after_timestamp]', dateToUnixTimestamp(fromDate));
    if (toDate) searchParams.set('filter[before_timestamp]', dateToUnixTimestamp(toDate));
    return searchParams;
  }

  static fetchSequenceBasedMacromoleculeSamplesByUIStateAndLimit(params) {
    return ApiClient.postJson('/api/v1/sequence_based_macromolecule_samples/ui_state', { body: params })
      .then((json) => json.sequence_based_macromolecule_samples.map((d) => new SequenceBasedMacromoleculeSample(d)));
  }

  static splitAsSubSequenceBasedMacromoleculeSample(params) {
    return ApiClient.postJson(
      '/api/v1/sequence_based_macromolecule_samples/sub_sequence_based_macromolecule_samples',
      { body: params }
    );
  }

  static fetchById(sbmmSampleId) {
    return ApiClient.getJson(`/api/v1/sequence_based_macromolecule_samples/${sbmmSampleId}`)
      .then((json) => this.sbmmSampleElement(json, sbmmSampleId));
  }

  static createSequenceBasedMacromoleculeSample(sbmmSample) {
    return AttachmentFetcher.uploadNewAttachmentsForContainer(sbmmSample.container)
      .then(() => ApiClient.postJson('/api/v1/sequence_based_macromolecule_samples', { body: sbmmSample.serialize() }))
      .then((json) => {
        if (json.error) return this.errorHandling(sbmmSample, json.error, true);
        const { id, sequence_based_macromolecule: sbmm } = json.sequence_based_macromolecule_sample;
        return Promise.all([
          this.sbmmSampleAttachments(sbmmSample, id),
          this.sbmmAttachments(sbmmSample.sequence_based_macromolecule, sbmm.id),
        ]).then(() => this.sbmmSampleElement(json, json.sequence_based_macromolecule_sample.id));
      });
  }

  static updateSequenceBasedMacromoleculeSample(sbmmSample) {
    const sbmm = sbmmSample.sequence_based_macromolecule;

    const tasks = [
      AttachmentFetcher.uploadNewAttachmentsForContainer(sbmmSample.container),
      this.sbmmSampleAttachments(sbmmSample, sbmmSample.id),
      this.sbmmAttachments(sbmm, sbmm.id),
    ];

    return Promise.all(tasks)
      .then(() => AnnotationsFetcher.updateAnnotations(sbmmSample))
      .then(() => ApiClient.putJson(
        `/api/v1/sequence_based_macromolecule_samples/${sbmmSample.id}`,
        { body: sbmmSample.serialize() }
      ))
      .then((json) => {
        if (json.error) return this.errorHandling(sbmmSample, json.error, false);
        const updatedSbmmSample = new SequenceBasedMacromoleculeSample(json.sequence_based_macromolecule_sample);
        if (sbmmSample.belongTo) { updatedSbmmSample.belongTo = sbmmSample.belongTo; }
        updatedSbmmSample.updated = true;
        updatedSbmmSample.updateChecksum();
        return updatedSbmmSample;
      });
  }

  static deleteSequenceBasedMacromoleculeSample(sequenceBasedMacromoleculeSampleId) {
    return ApiClient.deleteRequest(
      `/api/v1/sequence_based_macromolecule_samples/${sequenceBasedMacromoleculeSampleId}`
    );
  }

  static sbmmSampleElement(json, id) {
    if (json.error) {
      return new SequenceBasedMacromoleculeSample(
        {
          id: `${id}:error:SequenceBasedMacromoleculeSample ${id} is not accessible!`,
          is_new: true
        }
      );
    }
    const sbmmSample = new SequenceBasedMacromoleculeSample(json.sequence_based_macromolecule_sample);
    // eslint-disable-next-line no-underscore-dangle
    sbmmSample._checksum = sbmmSample.checksum();
    return sbmmSample;
  }

  static sbmmSampleAttachments(sbmmSample, id) {
    const newFiles = (sbmmSample.attachments || []).filter((a) => a.is_new && !a.is_deleted);
    const delFiles = (sbmmSample.attachments || []).filter((a) => !a.is_new && a.is_deleted);
    if (newFiles.length === 0 && delFiles.length === 0) return Promise.resolve();
    return AttachmentFetcher.updateAttachables(newFiles, 'SequenceBasedMacromoleculeSample', id, delFiles);
  }

  static sbmmAttachments(sbmm, id) {
    const newFiles = (sbmm.attachments || []).filter((a) => a.is_new && !a.is_deleted);
    const delFiles = (sbmm.attachments || []).filter((a) => !a.is_new && a.is_deleted);
    if (newFiles.length === 0 && delFiles.length === 0) return Promise.resolve();
    return AttachmentFetcher.updateAttachables(newFiles, 'SequenceBasedMacromolecule', id, delFiles);
  }

  static errorHandling(sbmmSample, error, isNew) {
    const sbmmSampleWithErrors = new SequenceBasedMacromoleculeSample(sbmmSample.serializeForCopy());
    if (!isNew) { sbmmSampleWithErrors.id = sbmmSample.id; }
    sbmmSampleWithErrors.is_new = isNew;
    if (Array.isArray(error)) {
      error.map((e) => {
        const message = ['is empty', 'is missing', 'does not have a valid value'].includes(e.message)
          ? "Can't be blank"
          : e.message;
        e.parameters.map((parameter) => {
          const matchedParameter = parameter.match(/^(\w+)_attributes/)
            ? parameter.match(/^(\w+)_attributes/)[1]
            : parameter;
          const parts = [matchedParameter, ...[...parameter.matchAll(/\[([^\]]+)\]/g)]
            .map((m) => m[1].replace(/_attributes$/, ''))];
          let errorKey;

          parts.reduce((obj, key, i) => {
            if (key == 'sequence') {
              errorKey = 'splitted_sequence';
            } else if (key.includes('modification')) {
              errorKey = `${key}s`;
            } else {
              errorKey = key;
            }
            // eslint-disable-next-line no-return-assign, no-param-reassign
            return obj[errorKey] ??= (i === parts.length - 1 ? message : {});
          }, sbmmSampleWithErrors.errors);
        });
      });
    } else {
      sbmmSampleWithErrors.errors = { conflict: error };
    }
    return sbmmSampleWithErrors;
  }
}
