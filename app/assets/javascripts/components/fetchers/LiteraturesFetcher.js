import 'whatwg-fetch';

export default class LiteraturesFetcher {

  static create(paramObj) {
    let promise = fetch('/api/v1/literatures', {
      credentials: 'same-origin',
      method: 'post',
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        reaction_id: paramObj.reaction_id,
        title: paramObj.title,
        url: paramObj.url
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