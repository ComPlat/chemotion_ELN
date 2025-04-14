import 'whatwg-fetch';
import BaseFetcher from 'src/fetchers/BaseFetcher';
import SequenceBasedMacromoleculeSample from 'src/models/SequenceBasedMacromoleculeSample';
import AttachmentFetcher from 'src/fetchers/AttachmentFetcher';

export default class SequenceBasedMacromoleculeSamplesFetcher {
  static fetchByCollectionId(id, queryParams = {}, isSync = false) {
    return BaseFetcher.fetchByCollectionId(
      id, queryParams, isSync, 'sequence_based_macromolecule_samples', SequenceBasedMacromoleculeSample
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
    return [];

    // return fetch('/api/v1/sequence_based_macromolecule_samples/sub_sequence_based_macromolecule_samples/', 
    //   {
    //     ...this._httpOptions('POST'),
    //     body: JSON.stringify(params)
    //   }
    // ).then(response => response.json())
    //   .then((json) => json)
    //   .catch(errorMessage => console.log(errorMessage));
  }

  static fetchById(sequenceBasedMacromoleculeSampleId) {
    return fetch(
      `/api/v1/sequence_based_macromolecule_samples/${sequenceBasedMacromoleculeSampleId}`,
      { ...this._httpOptions() }
    ).then(response => response.json())
      .then((json) => {
        if (json.error) {
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
    const newFiles = (sequenceBasedMacromoleculeSample.attachments || []).filter((a) => a.is_new && !a.is_deleted);

    const promise = () => fetch(
      `/api/v1/sequence_based_macromolecule_samples`,
      {
        ...this._httpOptions('POST'),
        body: JSON.stringify(sequenceBasedMacromoleculeSample.serialize())
      }
    ).then(response => response.json())
      .then((json) => {
        if (newFiles.length <= 0) {
          return new SequenceBasedMacromoleculeSample(json.sequence_based_macromolecule_sample);
        }
        return AttachmentFetcher.updateAttachables(
          newFiles, 'SequenceBasedMacromoleculeSample', json.sequence_based_macromolecule_sample.id, []
        )()
          .then(() => new SequenceBasedMacromoleculeSample(json.sequence_based_macromolecule_sample));
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
    const newFiles = (sequenceBasedMacromoleculeSample.attachments || []).filter((a) => a.is_new && !a.is_deleted);
    const delFiles = (sequenceBasedMacromoleculeSample.attachments || []).filter((a) => !a.is_new && a.is_deleted);

    const promise = () => fetch(
      `/api/v1/sequence_based_macromolecule_samples/${sequenceBasedMacromoleculeSample.id}`,
      {
        ...this._httpOptions('PUT'),
        body: JSON.stringify(sequenceBasedMacromoleculeSample.serialize())
      }
    ).then((response) => response.json())
      .then((json) => {
        const updatedSequenceBasedMacromoleculeSample =
          new SequenceBasedMacromoleculeSample(json.sequence_based_macromolecule_sample);
        updatedSequenceBasedMacromoleculeSample.updated = true;
        updatedSequenceBasedMacromoleculeSample.updateChecksum();
        return updatedSequenceBasedMacromoleculeSample;
      })
      .catch(errorMessage => console.log(errorMessage));

    const tasks = [];
    if (containerFiles.length > 0) {
      containerFiles.forEach((file) => tasks.push(AttachmentFetcher.uploadFile(file).then()));
    }
    if (newFiles.length > 0 || delFiles.length > 0) {
      tasks.push(
        AttachmentFetcher.updateAttachables(
          newFiles, 'SequenceBasedMacromoleculeSample', sequenceBasedMacromoleculeSample.id, delFiles
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
