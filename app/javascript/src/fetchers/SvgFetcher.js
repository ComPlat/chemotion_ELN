
import 'whatwg-fetch';

export default class SvgFetcher {
  static fetchsvg(params) {
    const promise = fetch(`/api/v1/svgfetcher`,{
      credentials: 'same-origin',
      method: 'POST',
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(params),
    }).then((response) => {
      console.log(response);
      return response.json();
    }).then((json) => {
      return json;
    }).catch((errorMessage) => {
      console.log(errorMessage);
    });

    return promise;
  }
}