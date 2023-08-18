import 'whatwg-fetch';

import Sample from 'src/models/Sample';
import NotificationActions from 'src/stores/alt/actions/NotificationActions';
import AttachmentFetcher from 'src/fetchers/AttachmentFetcher';
import BaseFetcher from 'src/fetchers/BaseFetcher';
import GenericElsFetcher from 'src/fetchers/GenericElsFetcher';


export default class SamplesFetcher {
  static fetchSamplesByUIStateAndLimit(params) {
    const limit = params.limit ? limit : null;

    return fetch('/api/v1/samples/ui_state/', {
      credentials: 'same-origin',
      method: 'POST',
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        ui_state: {
          all: params.sample.all,
          included_ids: params.sample.included_ids,
          excluded_ids: params.sample.excluded_ids,
          collection_id: params.sample.collection_id
        },
        limit: params.limit
      })
    }).then((response) => {
      return response.json()
    }).then((json) => {
      return json.samples.map((s) => new Sample(s));
    }).catch((errorMessage) => {
      console.log(errorMessage);
    });
  }

  static fetchById(id) {
    let promise = fetch('/api/v1/samples/' + id + '.json', {
      credentials: 'same-origin'
    })
      .then((response) => {
        return response.json()
      }).then((json) => {
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

  static fetchByCollectionId(id, queryParams = {}, moleculeSort = false) {
    queryParams.moleculeSort = moleculeSort;
    return BaseFetcher.fetchByCollectionId(id, queryParams, 'samples', Sample);
  }

  static findByShortLabel(shortLabel) {
    return fetch(
      `/api/v1/samples/findByShortLabel/${shortLabel}.json`,
      {
        credentials: 'same-origin',
        headers: { 'Content-Type': 'application/json' }
      }
    ).then((response) => response.json()).catch(errorMessage => console.log(errorMessage))
  }

  static update(sample) {
    const files = AttachmentFetcher.getFileListfrom(sample.container);
    const promise = () => fetch(`/api/v1/samples/${sample.id}`, {
      credentials: 'same-origin',
      method: 'put',
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(sample.serialize())
    }).then(response => response.json())
      .then(json => GenericElsFetcher.uploadGenericFiles(sample, json.sample.id, 'Sample')   
      .then(() => BaseFetcher.updateAnnotationsInContainer(sample))
      .then(() => this.fetchById(json.sample.id))).catch((errorMessage) => {
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

  static create(sample) {
    const files = AttachmentFetcher.getFileListfrom(sample.container);
    const promise = () => fetch('/api/v1/samples', {
      credentials: 'same-origin',
      method: 'post',
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(sample.serialize())
    }).then(response => response.json())
      .then(json => GenericElsFetcher.uploadGenericFiles(sample, json.sample.id, 'Sample')
        .then(() => this.fetchById(json.sample.id))).catch((errorMessage) => {
          console.log(errorMessage);
        });
    if (files.length > 0) {
      let tasks = [];
      files.forEach(file => tasks.push(AttachmentFetcher.uploadFile(file)));
      return Promise.all(tasks).then(() => {
        return promise();
      });
    }

    return promise();
  }

  static splitAsSubsamples(params) {
    let promise = fetch('/api/v1/samples/subsamples/', {
      credentials: 'same-origin',
      method: 'POST',
      headers: {
        'Accept': 'application/json',
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
    }).then((response) => {
      return response.json()
    }).then((json) => {
      return json;
    }).catch((errorMessage) => {
      console.log(errorMessage);
    });

    return promise;
  }

  static importSamplesFromFile(params) {
    const data = new FormData();
    data.append('file', params.file);
    data.append('currentCollectionId', params.currentCollectionId);

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
    let promise = fetch('/api/v1/samples/confirm_import/', {
      credentials: 'same-origin',
      method: 'post',
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        currentCollectionId: params.currentCollectionId,
        rows: params.rows,
        mapped_keys: params.mapped_keys,
      })
    }).then((response) => {
      return response.json();
    }).then((json) => {
      for (let i = 0; i < json.error_messages.length; i++) {
        NotificationActions.add({
          message: json.error_messages[i],
          level: 'error',
          autoDismiss: 10
        });
      };

      return json;
    }).catch((errorMessage) => {
      console.log(errorMessage);
    });

    return promise;
  }
}
