import 'whatwg-fetch';

export default class EditorFetcher {
  static initial() {
    const promise = fetch('/api/v1/editor/initial.json', {
      credentials: 'same-origin'
    })
      .then(response => response.json()).then(json => json).catch((errorMessage) => {
        console.log(errorMessage);
      });
    return promise;
  }

  static startEditing(params) {
    const { attachmentId, forceStop } = params;
    const promise = fetch(`/api/v1/editor/${attachmentId}/${forceStop ? 'end' : 'start'}/`, {
      credentials: 'same-origin',
      method: 'GET',
    })
      .then(response => response.json()).catch((errorMessage) => {
        console.log(errorMessage);
      });
    return promise;
  }
}
