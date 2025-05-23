import 'whatwg-fetch';

import Sample from 'src/models/Sample';
import NotificationActions from 'src/stores/alt/actions/NotificationActions';
import AttachmentFetcher from 'src/fetchers/AttachmentFetcher';
import BaseFetcher from 'src/fetchers/BaseFetcher';
import GenericElsFetcher from 'src/fetchers/GenericElsFetcher';

export default class SamplesFetcher {
  static fetchSamplesByUIStateAndLimit(params) {
    return fetch('/api/v1/samples/ui_state/', {
      credentials: 'same-origin',
      method: 'POST',
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        ui_state: {
          all: params.sample.all,
          included_ids: params.sample.included_ids,
          excluded_ids: params.sample.excluded_ids,
          collection_id: params.sample.collection_id
        },
        limit: params?.limit || null
      })
    }).then((response) => response.json())
      .then((json) => json.samples.map((s) => new Sample(s)))
      .catch((errorMessage) => {
        console.log(errorMessage);
      });
  }

  static fetchById(id) {
    const promise = fetch(`/api/v1/samples/${id}.json`, {
      credentials: 'same-origin'
    })
      .then((response) => response.json()).then((json) => {
        const rSample = new Sample(json.sample);
        if (json.error) {
          rSample.id = `${id}:error:Sample ${id} is not accessible!`;
        }
        return rSample;
      }).catch((errorMessage) => {
        console.log(errorMessage);
      });
    return promise;
  }

  static fetchByCollectionId(id, queryParams = {}, isSync = false, moleculeSort = false) {
    const updatedQueryParams = { ...queryParams, moleculeSort };
    return BaseFetcher.fetchByCollectionId(id, updatedQueryParams, isSync, 'samples', Sample);
  }

  static findByShortLabel(shortLabel) {
    return fetch(
      `/api/v1/samples/findByShortLabel/${shortLabel}.json`,
      {
        credentials: 'same-origin',
        headers: { 'Content-Type': 'application/json' }
      }
    ).then((response) => response.json()).catch((errorMessage) => console.log(errorMessage));
  }

  static update(sample) {
    const promise = () => fetch(`/api/v1/samples/${sample.id}`, {
      credentials: 'same-origin',
      method: 'put',
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(sample.serialize())
    }).then((response) => response.json())
      .then((json) => GenericElsFetcher.uploadGenericFiles(sample, json.sample.id, 'Sample')
        .then(() => BaseFetcher.updateAnnotationsInContainer(sample))
        .then(() => this.fetchById(json.sample.id))).catch((errorMessage) => {
        console.log(errorMessage);
      });

    return AttachmentFetcher.uploadNewAttachmentsForContainer(sample.container)
      .then(() => promise());
  }

  static create(sample) {
    const promise = () => fetch('/api/v1/samples', {
      credentials: 'same-origin',
      method: 'post',
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(sample.serialize())
    }).then((response) => response.json())
      .then((json) => GenericElsFetcher.uploadGenericFiles(sample, json.sample.id, 'Sample')
        .then(() => this.fetchById(json.sample.id))).catch((errorMessage) => {
        console.log(errorMessage);
      });
    return AttachmentFetcher.uploadNewAttachmentsForContainer(sample.container).then(() => promise());
  }

  static splitAsSubsamples(params) {
    const promise = fetch('/api/v1/samples/subsamples/', {
      credentials: 'same-origin',
      method: 'POST',
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        ui_state: {
          sample: {
            all: params.sample.checkedAll,
            included_ids: params.sample.checkedIds,
            excluded_ids: params.sample.uncheckedIds
          },
          currentCollectionId: params.currentCollection.id
        }
      })
    }).then((response) => response.json()).then((json) => json).catch((errorMessage) => {
      console.log(errorMessage);
    });

    return promise;
  }

  static importSamplesFromFile(params) {
    const data = new FormData();
    if (params.file !== undefined) {
      data.append('file', params.file);
    } else {
      const jsonData = JSON.stringify(params.data);
      data.append('data', jsonData);
      data.append('originalFormat', params.originalFormat);
    }
    data.append('currentCollectionId', params.currentCollectionId);
    data.append('import_type', params.type);

    const promise = fetch('/api/v1/samples/import/', {
      credentials: 'same-origin',
      method: 'post',
      body: data
    }).then((response) => response.json())
      .then((json) => json).catch((errorMessage) => {
        console.log(errorMessage);
      });
    return promise;
  }

  static importSamplesFromFileConfirm(params) {
    const promise = fetch('/api/v1/samples/confirm_import/', {
      credentials: 'same-origin',
      method: 'post',
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        currentCollectionId: params.currentCollectionId,
        rows: params.rows,
        mapped_keys: params.mapped_keys,
      })
    }).then((response) => response.json()).then((json) => {
      if (Array.isArray(json.error_messages)) {
        json.error_messages.forEach((message) => {
          NotificationActions.add({
            message,
            level: 'error',
            autoDismiss: 10
          });
        });
      } else {
        NotificationActions.add({
          message: json.error_messages || json.message,
          level: json.message ? 'success' : 'error',
          autoDismiss: 10
        });
      }
      return json;
    }).catch((errorMessage) => {
      console.log(errorMessage);
    });

    return promise;
  }
}
