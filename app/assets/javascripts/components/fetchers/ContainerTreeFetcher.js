import 'whatwg-fetch';

export default class ContainerTreeFetcher {

  static fetchByCollectionId(id, type) {
    let promise = fetch('/api/v1/tree/' + id + '.json?' + "type=" +type, {
      credentials: 'same-origin'
    })
    .then((response) => {
      return response.json()
    }).then((json) => {
      return json;
    }).catch((errorMessage) => {
      console.log(errorMessage);
    });

    return promise;
  }

  static updateTree(collection_id, type, treeData) {
    console.log(treeData)
    let promise = fetch('/api/v1/tree/', {
      credentials: 'same-origin',
      method: 'PUT',
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({collection_id, type, treeData})
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
