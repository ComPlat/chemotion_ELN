// indigo service: https://github.dev/epam/Indigo/tree/master/utils/indigo-service/backend/service
import 'whatwg-fetch';

export default class IndigoServiceFetcher {
  static renderSampleSvgWithIndigo(params) {
    return fetch('/api/v1/samples/render-svg-indigo', {
      credentials: 'same-origin',
      method: 'POST',
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        molfile: params.molfile,
        svg_path: params.svg_path,
      })
    })
      .then((response) => {
        if (!response.ok) throw new Error(`HTTP error ${response.status}`);
        return response.json(); // ✅ RETURN this
      })
      .then((json) => json)
      .catch((error) => {
        console.error('Indigo render error:', error);
        return null; // optionally return null or a fallback
      });
  }
}