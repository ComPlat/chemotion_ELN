import 'whatwg-fetch';
import Screen from '../models/Screen';
import UIStore from '../stores/UIStore'
import AttachmentFetcher from './AttachmentFetcher'
import BaseFetcher from './BaseFetcher';

export default class ScreensFetcher {
  static fetchById(id) {
    let promise = fetch('/api/v1/screens/' + id + '.json', {
      credentials: 'same-origin'
    })
      .then((response) => {
        return response.json()
      }).then((json) => {
        const rScreen = new Screen(json.screen);
        if (json.error) {
          rScreen.id = `${id}:error:Screen ${id} is not accessible!`;
        }
        return rScreen;
      }).catch((errorMessage) => {
        console.log(errorMessage);
      });
    return promise;
  }

  static fetchByCollectionId(id, queryParams = {}, isSync = false) {
    return BaseFetcher.fetchByCollectionId(id, queryParams, isSync, 'screens', Screen);
  }

  static update(screen) {
    let files = AttachmentFetcher.getFileListfrom(screen.container)

    let promise = () => fetch('/api/v1/screens/' + screen.id, {
      credentials: 'same-origin',
      method: 'put',
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(screen.serialize())
    }).then((response) => {
      return response.json()
    }).then((json) => {
      return new Screen(json.screen);
    }).catch((errorMessage) => {
      console.log(errorMessage);
    });

    if(files.length > 0 ){
        return AttachmentFetcher.uploadFiles(files)().then(()=> promise());
    }else{
      return promise()
    }

  }

  static create(screen) {
    let files = AttachmentFetcher.getFileListfrom(screen.container)

    let promise = () => fetch('/api/v1/screens/', {
      credentials: 'same-origin',
      method: 'post',
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(screen.serialize())
    }).then((response) => {
      return response.json()
    }).then((json) => {
      return new Screen(json.screen);
    }).catch((errorMessage) => {
      console.log(errorMessage);
    });

    if(files.length > 0){
      return AttachmentFetcher.uploadFiles(files)().then(()=> promise());
    }else{
      return promise()
    }

  }
}
