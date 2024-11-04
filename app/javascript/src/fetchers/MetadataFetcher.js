import Metadata from 'src/models/Metadata';

export default class MetadataFetcher {
  static fetch(id) {
    return fetch(`/api/v1/collections/${id}/metadata/`, {
      credentials: 'same-origin'
    })
    .then(response => {
      if (response.status == 404) {
        return null
      } else {
        return response.json()
      }
    })
    .then(json => {
      if (json === null) {
        return Metadata.buildEmpty(id)
      } else {
        return new Metadata(Object.assign({type: 'metadata'}, json))
      }
    })
  }

  static store(metadata) {
    return fetch(`/api/v1/collections/${metadata.collection_id}/metadata/`, {
      credentials: 'same-origin',
      method: 'post',
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(metadata.serialize())
    }).then((response) => {
      return response.json()
    }).then((json) => {
      return new Metadata(Object.assign({type: 'metadata'}, json))
    }).catch((errorMessage) => {
      console.log(errorMessage);
    });
  }
}
