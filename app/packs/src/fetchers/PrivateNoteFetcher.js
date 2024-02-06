import 'whatwg-fetch';
import PrivateNote from 'src/models/PrivateNote';

// improved function for classifying strings - to fix research_plan being an invalid noteable type
// takes into account any _ in strings and returns string: String_test => StringTest
function classify(string) {
  if (string.includes('_')) {
    var substrings = string.split('_');
    for (let i = 0; i < substrings.length; i++) {
      substrings[i] = substrings[i].charAt(0).toUpperCase() + substrings[i].slice(1);
    }
    string = substrings.join('')
  }
  else {
    string = string.charAt(0).toUpperCase() + string.slice(1);
  }
  return string;
}

export default class PrivateNoteFetcher {
  static fetchById(id) {
    return fetch(`/api/v1/private_notes/${id}.json`, {
      credentials: 'same-origin'
    }).then(response => response.json())
      .then(json => json)
      .catch((errorMessage) => { console.log(errorMessage); });
  }

  static fetchByNoteableId(noteable_id, noteable_type) {
    return fetch(`/api/v1/private_notes?noteable_id=${noteable_id}&noteable_type=${classify(noteable_type)}`, {
      credentials: 'same-origin',
    }).then(response => response.json())
      .then(json => new PrivateNote(json.note))
      .catch((errorMessage) => { console.log(errorMessage); });
  }

  static create(prms) {
    const params = { ...prms };
    if (prms.noteable_type) {
      params.noteable_type = classify(prms.noteable_type);
    }
    return fetch('/api/v1/private_notes', {
      credentials: 'same-origin',
      method: 'post',
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(params)
    }).then(response => response.json())
      .then(json => new PrivateNote(json.note))
      .catch((errorMessage) => { console.log(errorMessage); });
  }

  static update(privateNote) {
    return fetch(`/api/v1/private_notes/${privateNote.id}`, {
      credentials: 'same-origin',
      method: 'put',
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(privateNote.serialize())
    }).then(response => response.json())
      .then(json => new PrivateNote(json.note))
      .catch((errorMessage) => { console.log(errorMessage); });
  }
}
