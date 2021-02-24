import 'whatwg-fetch';
import PrivateNote from '../models/PrivateNote'

export default class PrivateNoteFetcher {
  static fetchById(id) {
    let promise = fetch('/api/v1/private_notes/' + id + '.json', {
      credentials: 'same-origin'
    }).then((response) => {
      return response.json()
    }).then((json) => {
      return json
    }).catch((errorMessage) => {
      console.log(errorMessage);
    });
    return promise;
  }

  static fetchByNoteableId(noteable_id, noteable_type) {
    let promise = () => fetch('/api/v1/private_notes', {
      credentials: 'same-origin',
      method: 'post',
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        noteable_id: noteable_id,
        noteable_type: noteable_type
      })
    }).then((response) => {
      return response.json()
    }).then((json) => {
      let note = new PrivateNote(json.note)
      return note
    }).catch((errorMessage) => {
      console.log(errorMessage);
    });
  
    return promise()
  }

  static create(params) {
    let promise = () => fetch('/api/v1/private_notes/create', {
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
      let note = new PrivateNote(json.note)
      return note
    }).catch((errorMessage) => {
      console.log(errorMessage);
    });
  
    return promise()
  }

  static update(privateNote) {
    let promise = () => fetch('/api/v1/private_notes/' + privateNote.id, {
      credentials: 'same-origin',
      method: 'put',
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(privateNote.serialize())
    }).then((response) => {
      return response.json()
    }).then((json) => {
      let note = new PrivateNote(json.note)
      return note
    }).catch((errorMessage) => {
      console.log(errorMessage);
    });

    return promise()
  }
}