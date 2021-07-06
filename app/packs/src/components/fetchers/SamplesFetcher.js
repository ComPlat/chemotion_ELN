import 'whatwg-fetch';

import Sample from '../models/Sample';
import UIStore from '../stores/UIStore';
import NotificationActions from '../actions/NotificationActions';
import AttachmentFetcher from './AttachmentFetcher';
import BaseFetcher from './BaseFetcher';


import Container from '../models/Container';

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

  static fetchByCollectionId(id, queryParams = {}, isSync = false, moleculeSort = false) {
    queryParams.moleculeSort = moleculeSort;
    return BaseFetcher.fetchByCollectionId(id, queryParams, isSync, 'samples', Sample);
  }

  static update(sample) {
    let files = AttachmentFetcher.getFileListfrom(sample.container)
    let promise = ()=> fetch('/api/v1/samples/' + sample.id, {
      credentials: 'same-origin',
      method: 'put',
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(sample.serialize())
    }).then((response) => {
      return response.json()
    }).then((json) => {
      return new Sample(json.sample);
    }).catch((errorMessage) => {
      console.log(errorMessage);
    });

    if(files.length > 0) {
      return AttachmentFetcher.uploadFiles(files)().then(()=> promise());
    } else {
      return promise()
    }

  }

  static create(sample) {
    let files = AttachmentFetcher.getFileListfrom(sample.container)
    let promise = ()=> fetch('/api/v1/samples', {
      credentials: 'same-origin',
      method: 'post',
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(sample.serialize())
    }).then((response) => {
      return response.json()
    }).then((json) => {
      return new Sample(json.sample);
    }).catch((errorMessage) => {
      console.log(errorMessage);
    });
    if(files.length > 0) {
      return AttachmentFetcher.uploadFiles(files)().then(()=> promise());
    } else {
      return promise()
    }
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

    var data = new FormData();
    data.append("file", params.file);
    data.append("currentCollectionId", params.currentCollectionId);

    let promise = fetch('/api/v1/samples/import/', {
      credentials: 'same-origin',
      method: 'post',
      body: data
    }).then((response) => {
      return response.json()
    }).then((json) => {
      return json;
    }).catch((errorMessage) => {
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
      return response.json()
    }).then((json) => {
      return json;
    }).catch((errorMessage) => {
      console.log(errorMessage);
    });

    return promise;
  }
}
