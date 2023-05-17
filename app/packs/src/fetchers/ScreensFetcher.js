import 'whatwg-fetch';
import Screen from 'src/models/Screen';
import AttachmentFetcher from 'src/fetchers/AttachmentFetcher'
import BaseFetcher from 'src/fetchers/BaseFetcher';
import GenericElsFetcher from 'src/fetchers/GenericElsFetcher';

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

  static fetchByCollectionId(id, queryParams = {}) {
    return BaseFetcher.fetchByCollectionId(id, queryParams, 'screens', Screen);
  }

  static update(screen) {
    const files = AttachmentFetcher.getFileListfrom(screen.container);

    const promise = () => fetch(`/api/v1/screens/${screen.id}`, {
      credentials: 'same-origin',
      method: 'put',
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(screen.serialize())
    }).then(response => response.json())
      .then(json => GenericElsFetcher.uploadGenericFiles(screen, json.screen.id, 'Screen')
      .then(()=>BaseFetcher.updateAnnotationsInContainer(screen))  
      .then(() => this.fetchById(json.screen.id))).catch((errorMessage) => {
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

  static create(screen) {
    const files = AttachmentFetcher.getFileListfrom(screen.container);

    const promise = () => fetch('/api/v1/screens/', {
      credentials: 'same-origin',
      method: 'post',
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(screen.serialize())
    }).then(response => response.json())
      .then(json => GenericElsFetcher.uploadGenericFiles(screen, json.screen.id, 'Screen')
        .then(() => this.fetchById(json.screen.id))).catch((errorMessage) => {
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

  static addResearchPlan(screen_id, collection_id) {
    return fetch(
      `/api/v1/screens/${screen_id}/add_research_plan`,
      {
        credentials: 'same-origin',
        method: 'POST',
        headers: {
          Accept: 'application/json',
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ collection_id })
      }
    ).then(response => response.json()).catch(errorMessage => console.log(errorMessage));
  }
}
