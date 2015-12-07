import 'whatwg-fetch';

export default class BaseFetcher {
  /**
   * @param {Object} params = { apiEndpoint, requestMethod, bodyData, jsonTranformation }
   */
  static withBodyData(params) {
    const { apiEndpoint, requestMethod, bodyData, jsonTranformation } = params;
    let promise = fetch(apiEndpoint, {
      credentials: 'same-origin',
      method: requestMethod,
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(bodyData)
    }).then((response) => {
      return response.json()
    }).then((json) => {
      return jsonTranformation(json)
    }).catch((errorMessage) => {
      console.log(errorMessage);
    });

    return promise;
  }

  /**
   * @param {Object} params = { apiEndpoint, requestMethod, jsonTranformation }
   */
  static withoutBodyData(params) {
    const { apiEndpoint, requestMethod, jsonTranformation } = params;

    let promise = fetch(apiEndpoint, {
      credentials: 'same-origin',
      method: requestMethod
    }).then((response) => {
      return response.json()
    }).then((json) => {
      return jsonTranformation(json)
    }).catch((errorMessage) => {
      console.log(errorMessage);
    });

    return promise;
  }
}
