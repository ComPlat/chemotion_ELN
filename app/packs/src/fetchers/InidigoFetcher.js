// for more details for indigo service: https://github.dev/epam/Indigo/tree/master/utils/indigo-service/backend/service
import 'whatwg-fetch';

export default class IndigoServiceFetcher {
  static convertMolfileStructure(params) {
    const { struct, output_format } = params;

    // enum: param output_format ***
    // default: chemical/x-mdl-molfile
    // - chemical/x-mdl-rxnfile
    // - chemical/x-mdl-molfile
    // - chemical/x-indigo-ket
    // - chemical/x-daylight-smiles
    // - chemical/x-chemaxon-cxsmiles
    // - chemical/x-cml
    // - chemical/x-inchi
    // - chemical/x-inchi-key
    // - chemical/x-iupac
    // - chemical/x-daylight-smarts
    // - chemical/x-inchi-aux

    return fetch(`/api/v1/molecules/indigo/structure/convert`, {
      credentials: 'same-origin',
      method: 'POST',
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        struct,
        output_format
      }),
    })
      .then((response) => response.json())
      .then((json) => json)
      .catch((errorMessage) => {
        console.log(errorMessage.message);
      });
  }

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