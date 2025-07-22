import 'whatwg-fetch';
import BaseFetcher from 'src/fetchers/BaseFetcher';
import SequenceBasedMacromoleculeSample from 'src/models/SequenceBasedMacromoleculeSample';
import AttachmentFetcher from 'src/fetchers/AttachmentFetcher';

export default class SequenceBasedMacromoleculeSamplesFetcher {
  static fetchByCollectionId(id, queryParams = {}, isSync = false, listOrder = 'sbmm') {
    const updatedQueryParams = { ...queryParams, listOrder };
    return BaseFetcher.fetchByCollectionId(
      id, updatedQueryParams, isSync, 'sequence_based_macromolecule_samples', SequenceBasedMacromoleculeSample
    );
  }

  static fetchSequenceBasedMacromoleculeSamplesByUIStateAndLimit(params) {
    const limit = params.limit ? params.limit : null;

    return fetch('/api/v1/sequence_based_macromolecule_samples/ui_state/', 
      {
        ...this._httpOptions('POST'),
        body: JSON.stringify(params)
      }
    ).then(response => response.json())
      .then((json) => {
        return json.sequence_based_macromolecule_samples.map((d) => new SequenceBasedMacromoleculeSample(d))
      })
      .catch(errorMessage => console.log(errorMessage));
  }

  static splitAsSubSequenceBasedMacromoleculeSample(params) {
    return fetch('/api/v1/sequence_based_macromolecule_samples/sub_sequence_based_macromolecule_samples/', 
      {
        ...this._httpOptions('POST'),
        body: JSON.stringify(params)
      }
    ).then(response => response.json())
      .then((json) => json)
      .catch(errorMessage => console.log(errorMessage));
  }

  static fetchById(sequenceBasedMacromoleculeSampleId) {
    return fetch(
      `/api/v1/sequence_based_macromolecule_samples/${sequenceBasedMacromoleculeSampleId}`,
      { ...this._httpOptions() }
    ).then(response => response.json())
      .then((json) => {
        if (json.error) {
          const id = sequenceBasedMacromoleculeSampleId;
          return new SequenceBasedMacromoleculeSample(
            { id: `${id}:error:SequenceBasedMacromoleculeSample ${id} is not accessible!`, is_new: true }
          );
        } else {
          const sequence_based_macromolecule_sample =
            new SequenceBasedMacromoleculeSample(json.sequence_based_macromolecule_sample);
          sequence_based_macromolecule_sample._checksum = sequence_based_macromolecule_sample.checksum();
          return sequence_based_macromolecule_sample;
        }
      })
      .catch(errorMessage => console.log(errorMessage));
  }

  static createSequenceBasedMacromoleculeSample(sequenceBasedMacromoleculeSample) {
    const containerFiles = AttachmentFetcher.getFileListfrom(sequenceBasedMacromoleculeSample.container);
    const newSampleAttachmentFiles =
      (sequenceBasedMacromoleculeSample.attachments || []).filter((a) => a.is_new && !a.is_deleted);
    const newSBMMAttachmentFiles =
      (sequenceBasedMacromoleculeSample.sequence_based_macromolecule.attachments || []).filter((a) => a.is_new && !a.is_deleted);

    const promise = () => fetch(
      `/api/v1/sequence_based_macromolecule_samples`,
      {
        ...this._httpOptions('POST'),
        body: JSON.stringify(sequenceBasedMacromoleculeSample.serialize())
      }
    ).then(response => response.json())
      .then((json) => {
        if (json.error) {
          return this.errorHandling(sequenceBasedMacromoleculeSample, json.error, true);
        } else if (json.sequence_based_macromolecule_sample) {
          if (newSampleAttachmentFiles.length <= 0 && newSBMMAttachmentFiles.length <= 0) {
            return new SequenceBasedMacromoleculeSample(json.sequence_based_macromolecule_sample);
          }

          const attachmentTasks = [];
          if (newSampleAttachmentFiles.length > 0) {
            attachmentTasks.push(
              AttachmentFetcher.updateAttachables(
                newSampleAttachmentFiles, 'SequenceBasedMacromoleculeSample',
                json.sequence_based_macromolecule_sample.id, []
              )()
            );
          }
          if (newSBMMAttachmentFiles.length > 0) {
            attachmentTasks.push(
              AttachmentFetcher.updateAttachables(
                newSBMMAttachmentFiles, 'SequenceBasedMacromolecule',
                json.sequence_based_macromolecule_sample.sequence_based_macromolecule.id, []
              )()
            );
          }

          return Promise.all(attachmentTasks)
            .then(() => new SequenceBasedMacromoleculeSample(json.sequence_based_macromolecule_sample));
        }
      })
      .catch(errorMessage => console.log(errorMessage));

    if (containerFiles.length > 0) {
      const tasks = [];
      containerFiles.forEach((file) => tasks.push(AttachmentFetcher.uploadFile(file).then()));
      return Promise.all(tasks).then(() => promise());
    }
    return promise();
  }

  static updateSequenceBasedMacromoleculeSample(sequenceBasedMacromoleculeSample) {
    const containerFiles = AttachmentFetcher.getFileListfrom(sequenceBasedMacromoleculeSample.container);
    const sbmm = sequenceBasedMacromoleculeSample.sequence_based_macromolecule;
    const newSampleAttachmentFiles = (sequenceBasedMacromoleculeSample.attachments || []).filter((a) => a.is_new && !a.is_deleted);
    const newSBMMAttachmentFiles = (sbmm.attachments || []).filter((a) => a.is_new && !a.is_deleted);
    const deletedSampleAttachmentFiles =
      (sequenceBasedMacromoleculeSample.attachments || []).filter((a) => !a.is_new && a.is_deleted);
    const deletedSBMMAttachmentFiles =
      (sbmm.attachments || []).filter((a) => !a.is_new && a.is_deleted);

    const promise = () => fetch(
      `/api/v1/sequence_based_macromolecule_samples/${sequenceBasedMacromoleculeSample.id}`,
      {
        ...this._httpOptions('PUT'),
        body: JSON.stringify(sequenceBasedMacromoleculeSample.serialize())
      }
    ).then((response) => response.json())
      .then((json) => {
        if (json.error) {
          return this.errorHandling(sequenceBasedMacromoleculeSample, json.error, false);
        } else if (json.sequence_based_macromolecule_sample) {
          const updatedSequenceBasedMacromoleculeSample =
            new SequenceBasedMacromoleculeSample(json.sequence_based_macromolecule_sample);
          updatedSequenceBasedMacromoleculeSample.updated = true;
          updatedSequenceBasedMacromoleculeSample.updateChecksum();
          return updatedSequenceBasedMacromoleculeSample;
        }
      })
      .catch(errorMessage => console.log(errorMessage));

    const tasks = [];
    if (containerFiles.length > 0) {
      containerFiles.forEach((file) => tasks.push(AttachmentFetcher.uploadFile(file).then()));
    }
    if (newSampleAttachmentFiles.length > 0 || deletedSampleAttachmentFiles.length > 0) {
      tasks.push(
        AttachmentFetcher.updateAttachables(
          newSampleAttachmentFiles, 'SequenceBasedMacromoleculeSample', sequenceBasedMacromoleculeSample.id, deletedSampleAttachmentFiles
        )()
      );
    }
    if (newSBMMAttachmentFiles.length > 0 || deletedSBMMAttachmentFiles.length > 0) {
      tasks.push(
        AttachmentFetcher.updateAttachables(
          newSBMMAttachmentFiles, 'SequenceBasedMacromolecule', sbmm.id, deletedSBMMAttachmentFiles
        )()
      );
    }
    return Promise.all(tasks)
      .then(() => BaseFetcher.updateAnnotations(sequenceBasedMacromoleculeSample))
      .then(() => promise());
  }

  static deleteSequenceBasedMacromoleculeSample(sequenceBasedMacromoleculeSampleId) {
    return fetch(
      `/api/v1/sequence_based_macromolecule_samples/${sequenceBasedMacromoleculeSampleId}`,
      { ...this._httpOptions('DELETE') }
    ).then(response => response.json())
      .catch(errorMessage => console.log(errorMessage));
  }

  static errorHandling(sequenceBasedMacromoleculeSample, error, isNew) {
    let sbmmSampleWithErrors =
      new SequenceBasedMacromoleculeSample(sequenceBasedMacromoleculeSample.serializeForCopy());
    if (!isNew) {
      sbmmSampleWithErrors.id = sequenceBasedMacromoleculeSample.id;
    }
    sbmmSampleWithErrors.is_new = isNew;
    if (Array.isArray(error)) {
      error.map((e) => {
        const message = ['is empty', 'is missing', 'does not have a valid value'].includes(e.message) ? "Can't be blank" : e.message;
        e.parameters.map((parameter) => {
          const matchedParameter = parameter.match(/^(\w+)_attributes/) ? parameter.match(/^(\w+)_attributes/)[1] : parameter;
          const parts = [matchedParameter, ...[...parameter.matchAll(/\[([^\]]+)\]/g)]
            .map(m => m[1].replace(/_attributes$/, ''))];

          parts.reduce((obj, key, i) => {
            const errorKey = key == 'sequence' ? 'splitted_sequence' : (key.includes('modification') ? `${key}s` : key);
            return obj[errorKey] ??= (i === parts.length - 1 ? message : {});
          }, sbmmSampleWithErrors.errors);
        });
      });
    } else {
      sbmmSampleWithErrors.errors = { conflict: error };
    }
    return sbmmSampleWithErrors;
  }

  static _httpOptions(method = 'GET') {
    return {
      credentials: 'same-origin',
      method: method,
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json'
      }
    };
  }
}
