import 'whatwg-fetch';
import Wellplate from '../models/Wellplate';
import UIStore from '../stores/UIStore';
import AttachmentFetcher from './AttachmentFetcher';
import BaseFetcher from './BaseFetcher';

export default class WellplatesFetcher {
  static fetchById(id) {
    let promise = fetch('/api/v1/wellplates/' + id + '.json', {
        credentials: 'same-origin'
      })
      .then((response) => {
        return response.json();
      }).then((json) => {
        if (json.error) {
          return new Wellplate({ id: `${id}:error:Wellplate ${id} is not accessible!`, wells: [], is_new: true });
        }
        return new Wellplate(json.wellplate);
      }).catch((errorMessage) => {
        console.log(errorMessage);
      });
    return promise;
  }

  static fetchByCollectionId(id, queryParams = {}, isSync = false) {
    return BaseFetcher.fetchByCollectionId(id, queryParams, isSync, 'wellplates', Wellplate);
  }

  static bulkCreateWellplates(params) {
    let promise = fetch('/api/v1/wellplates/bulk', {
      credentials: 'same-origin',
      method: 'post',
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(params)
    }).catch((errorMessage) => {
      console.log(errorMessage);
    });
    return promise;
  }

  static update(params) {

    const wellplate = new Wellplate(params);
    let files = AttachmentFetcher.getFileListfrom(wellplate.container)

    let promise = () => fetch('/api/v1/wellplates/' + wellplate.id, {
      credentials: 'same-origin',
      method: 'put',
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(wellplate.serialize())
    }).then((response) => {
      return response.json()
    }).then((json) => {
      return new Wellplate(json.wellplate);
    }).catch((errorMessage) => {
      console.log(errorMessage);
    });

    if(files.length > 0 ){
        return AttachmentFetcher.uploadFiles(files)().then(()=> promise());
    }else{
      return promise()
    }
  }

  static create(params) {
    let files = AttachmentFetcher.getFileListfrom(params.container)

    let promise = () => fetch('/api/v1/wellplates/', {
      credentials: 'same-origin',
      method: 'post',
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(params)
    }).then((response) => {
      return response.json()
    }).then((json) => {
      return new Wellplate(json.wellplate);
    }).catch((errorMessage) => {
      console.log(errorMessage);
    });

    if(files.length > 0){
      return AttachmentFetcher.uploadFiles(files)().then(()=> promise());
    }else{
      return promise()
    }
  }

  static fetchWellplatesByUIState(params) {
    return fetch('/api/v1/wellplates/ui_state/', {
      credentials: 'same-origin',
      method: 'POST',
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        ui_state: {
          all: params.wellplate.all,
          included_ids: params.wellplate.included_ids,
          excluded_ids: params.wellplate.excluded_ids,
          collection_id: params.wellplate.collection_id
        }
      })
    }).then((response) => {
      return response.json()
    }).then((json) => {
      return json.wellplates.map((w) => new Wellplate(w));
    }).catch((errorMessage) => {
      console.log(errorMessage);
    });
  }

  static splitAsSubwellplates(params) {
    const promise = fetch('/api/v1/wellplates/subwellplates/', {
      credentials: 'same-origin',
      method: 'POST',
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        ui_state: {
          wellplate: {
            all: params.wellplate.checkedAll,
            included_ids: params.wellplate.checkedIds,
            excluded_ids: params.wellplate.uncheckedIds
          },
          currentCollectionId: params.currentCollection.id
        }
      })
    }).then((response) => {
      return response.json();
    }).then((json) => {
      return json;
    }).catch((errorMessage) => {
      console.log(errorMessage);
    });

    return promise;
  }
}
