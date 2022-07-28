export default class SegmentsFetcher {
  static fetchKlass(elementName = null) {
    let api = '';
    if (elementName == null) {
      api = '/api/v1/segments/klasses.json';
    } else {
      api = `/api/v1/segments/klasses.json?element=${elementName}`;
    }
    return fetch(api, {
      credentials: 'same-origin'
    }).then(response => response.json()).then(json => json).catch((errorMessage) => {
      console.log(errorMessage);
    });
  }
}
