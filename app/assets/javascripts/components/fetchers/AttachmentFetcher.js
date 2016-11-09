import 'whatwg-fetch';

export default class AttachmentFetcher {
  static fetchThumbnail(params) {
    let promise = fetch(`/api/v1/attachments/thumbnails?filename=${params.filename}`, {
      credentials: 'same-origin',
      method: 'GET'
    }).then((response) => {
      return response.json()
    }).then((json) => {
      return json
    }).catch((errorMessage) => {
      console.log(errorMessage);
    });

    return promise;
  }

  static fetchThumbnail2(params) {
    let promise = fetch(`/api/v1/attachments/thumbnail?id=${params.id}`, {
      credentials: 'same-origin',
      method: 'GET'
    }).then((response) => {
      return response.json()
    }).then((json) => {
      return json
    }).catch((errorMessage) => {
      console.log(errorMessage);
    });

    return promise;
  }
}
