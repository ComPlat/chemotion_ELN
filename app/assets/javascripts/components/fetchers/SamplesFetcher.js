import 'whatwg-fetch';
import Sample from '../models/Sample';
import UIStore from '../stores/UIStore'
import NotificationActions from '../actions/NotificationActions'
import _ from 'lodash';

export default class SamplesFetcher {
  static fetchByUIState(params) {
    let promise = fetch('/api/v1/samples/ui_state/', {
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
        }
      })
    }).then((response) => {
      return response.json()
    }).then((json) => {
      return json.samples.map((s) => new Sample(s));
    }).catch((errorMessage) => {
      console.log(errorMessage);
    });

    return promise;
  }

  static fetchById(id) {
    let promise = fetch('/api/v1/samples/' + id + '.json', {
        credentials: 'same-origin'
      })
      .then((response) => {
        return response.json()
      }).then((json) => {
        return new Sample(json.sample);
      }).catch((errorMessage) => {
        console.log(errorMessage);
      });

    return promise;
  }

  static fetchByCollectionId(id, queryParams={}, isSync = false, moleculeSort = false) {
    let page = queryParams.page || 1;
    let per_page = queryParams.per_page || UIStore.getState().number_of_results
    let api =  `/api/v1/samples.json?${isSync ? "sync_" : "" }` +
               `collection_id=${id}&page=${page}&per_page=${per_page}&` +
               `molecule_sort=${moleculeSort ? 1 : 0}`
    let promise = fetch(api, {
        credentials: 'same-origin'
      })
      .then((response) => {
        return response.json().then((json) => {
          return {
            elements: json.molecules.map( m => {
              return m.samples.map( s => new Sample(s) )
            }),
            totalElements: parseInt(response.headers.get('X-Total')),
            page: parseInt(response.headers.get('X-Page')),
            pages: parseInt(response.headers.get('X-Total-Pages')),
            perPage: parseInt(response.headers.get('X-Per-Page'))
          }
        })
      }).catch((errorMessage) => {
        console.log(errorMessage);
      });

    return promise;
  }

  static uploadFiles(files) {
    var data = new FormData()
    files.forEach((file)=> {
      data.append(file.id || file.name, file);
    });
    return ()=>fetch('/api/v1/samples/upload_dataset_attachments', {
      credentials: 'same-origin',
      method: 'post',
      body: data
    }).then((response) => {
      if(response.ok == false) {
        let msg = 'Files uploading failed: ';
        if(response.status == 413) {
          msg += 'File size limit exceeded. Max size is 10MB'
        } else {
          msg += response.statusText;
        }
        NotificationActions.add({
          message: msg,
          level: 'error'
        });
      }
    })
  }

  static getFileListfrom(sample){
    let datasets = _.flatten(sample.analyses.map(a=>a.datasets));
    let attachments = _.flatten(datasets.map(d=>d.attachments));
    const fileFromAttachment = function(attachment) {
      let file = attachment.file;
      file.id = attachment.id;
      return file;
    }
    let files = _.compact(_.flatten(attachments.filter(a=>a.is_new).map(a=>fileFromAttachment(a))));
    return files
  }

  static update(sample) {
    let files = SamplesFetcher.getFileListfrom(sample.serialize())
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
      return SamplesFetcher.uploadFiles(files)().then(()=> promise());
    } else {
      return promise()
    }

  }

  static create(sample) {
    let files = SamplesFetcher.getFileListfrom(sample.serialize())
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
      return SamplesFetcher.uploadFiles(files)().then(()=> promise());
    } else {
      return promise()
    }
  }

  static deleteSamplesByUIState(params) {
    let promise = fetch('/api/v1/samples/ui_state/', {
      credentials: 'same-origin',
      method: 'DELETE',
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        ui_state: {
          all: params.sample.checkedAll,
          collection_id: params.currentCollection.id,
          included_ids: params.sample.checkedIds,
          excluded_ids: params.sample.uncheckedIds
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
}
