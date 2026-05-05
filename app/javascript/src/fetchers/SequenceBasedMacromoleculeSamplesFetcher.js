import ApiClient from 'src/api_clients/ChemotionApiClient';
import BaseFetcher from 'src/fetchers/BaseFetcher';
import SequenceBasedMacromoleculeSample from 'src/models/SequenceBasedMacromoleculeSample';
import AttachmentFetcher from 'src/fetchers/AttachmentFetcher';

export default class SequenceBasedMacromoleculeSamplesFetcher {
  static fetchByCollectionId(id, queryParams = {}, listOrder = 'sbmm') {
    return BaseFetcher.fetchByCollectionId(
      id,
      { ...queryParams, listOrder },
      'sequence_based_macromolecule_samples',
      SequenceBasedMacromoleculeSample
    );
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
      .then((json) => {
        if (json.error) {
          return new SequenceBasedMacromoleculeSample(
            {
              id: `${sbmmSampleId}:error:SequenceBasedMacromoleculeSample ${sbmmSampleId} is not accessible!`,
              is_new: true
            }
          );
        }
        const sbmmSample = new SequenceBasedMacromoleculeSample(json.sequence_based_macromolecule_sample);
        // eslint-disable-next-line no-underscore-dangle
        sbmmSample._checksum = sbmmSample.checksum();
        return sbmmSample;
      });
  }

  static createSequenceBasedMacromoleculeSample(sbmmSample) {
    const { sbmmSampleFiles, sbmmFiles } = this.filesForSbmmSampleAndSbmm(sbmmSample);

    const promise = () => ApiClient.postJson(
      '/api/v1/sequence_based_macromolecule_samples',
      { body: sbmmSample.serialize() }
    )
      .then((json) => {
        if (json.error) {
          return this.errorHandling(sbmmSample, json.error, true);
        }

        if (sbmmSampleFiles.length <= 0 && sbmmFiles.length <= 0) {
          return new SequenceBasedMacromoleculeSample(json.sequence_based_macromolecule_sample);
        }

        const attachmentTasks = [];
        if (sbmmSampleFiles.length > 0) {
          attachmentTasks.push(
            AttachmentFetcher.updateAttachables(
              sbmmSampleFiles,
              'SequenceBasedMacromoleculeSample',
              json.sequence_based_macromolecule_sample.id,
              []
            )()
          );
        }
        if (sbmmFiles.length > 0) {
          attachmentTasks.push(
            AttachmentFetcher.updateAttachables(
              sbmmFiles,
              'SequenceBasedMacromolecule',
              json.sequence_based_macromolecule_sample.sequence_based_macromolecule.id,
              []
            )()
          );
        }

        return Promise.all(attachmentTasks)
          .then(() => new SequenceBasedMacromoleculeSample(json.sequence_based_macromolecule_sample));
      });

    return AttachmentFetcher.uploadNewAttachmentsForContainer(sbmmSample.container)
      .then(() => promise());
  }

  static updateSequenceBasedMacromoleculeSample(sbmmSample) {
    const {
      sbmmSampleFiles, sbmmFiles, deletedSbmmSampleFiles, deletedSbmmFiles
    } = this.filesForSbmmSampleAndSbmm(sbmmSample);
    const sbmm = sbmmSample.sequence_based_macromolecule;

    const promise = () => ApiClient.putJson(
      `/api/v1/sequence_based_macromolecule_samples/${sbmmSample.id}`,
      {
        body: sbmmSample.serialize()
      }
    )
      .then((json) => {
        if (json.error) {
          return this.errorHandling(sbmmSample, json.error, false);
        }
        const updatedSbmmSample = new SequenceBasedMacromoleculeSample(json.sequence_based_macromolecule_sample);
        if (sbmmSample.belongTo) { updatedSbmmSample.belongTo = sbmmSample.belongTo; }
        updatedSbmmSample.updated = true;
        updatedSbmmSample.updateChecksum();
        return updatedSbmmSample;
      });

    const tasks = [];
    tasks.push(AttachmentFetcher.uploadNewAttachmentsForContainer(sbmmSample.container));
    if (sbmmSampleFiles.length > 0 || deletedSbmmSampleFiles.length > 0) {
      tasks.push(
        AttachmentFetcher.updateAttachables(
          sbmmSampleFiles,
          'SequenceBasedMacromoleculeSample',
          sbmmSample.id,
          deletedSbmmSampleFiles
        )()
      );
    }
    if (sbmmFiles.length > 0 || deletedSbmmFiles.length > 0) {
      tasks.push(
        AttachmentFetcher.updateAttachables(sbmmFiles, 'SequenceBasedMacromolecule', sbmm.id, deletedSbmmFiles)()
      );
    }
    return Promise.all(tasks)
      .then(() => BaseFetcher.updateAnnotations(sbmmSample))
      .then(() => promise());
  }

  static deleteSequenceBasedMacromoleculeSample(sequenceBasedMacromoleculeSampleId) {
    return ApiClient.deleteRequest(
      `/api/v1/sequence_based_macromolecule_samples/${sequenceBasedMacromoleculeSampleId}`
    );
  }

  static filesForSbmmSampleAndSbmm(sbmmSample) {
    const sbmm = sbmmSample.sequence_based_macromolecule;
    const sbmmSampleFiles = (sbmmSample.attachments || []).filter((a) => a.is_new && !a.is_deleted);
    const sbmmFiles = (sbmm.attachments || []).filter((a) => a.is_new && !a.is_deleted);
    const deletedSbmmSampleFiles = (sbmmSample.attachments || []).filter((a) => !a.is_new && a.is_deleted);
    const deletedSbmmFiles = (sbmm.attachments || []).filter((a) => !a.is_new && a.is_deleted);
    return {
      sbmmSampleFiles, sbmmFiles, deletedSbmmFiles, deletedSbmmSampleFiles
    };
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
