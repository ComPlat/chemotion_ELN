// indigo service: https://github.dev/epam/Indigo/tree/master/utils/indigo-service/backend/service
import 'whatwg-fetch';

export default class IndigoServiceFetcher {
  static rendertMolfileToSvg(params) {
    const { struct } = params;

    return fetch(`/api/v1/molecules/indigo/structure/render`, {
      credentials: 'same-origin',
      method: 'POST',
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        struct,
        output_format: "image/svg+xml"
      }),
    })
      .then((response) => response.json())
      .then((json) => json)
      .catch((errorMessage) => {
        console.log(errorMessage.message);
      });
  }
}