import 'whatwg-fetch';

export default class SampleSvgFetcher {

  static fetchCombinedSampleSvg(materialsSvgPaths) {
    const promise = fetch('/api/v1/sample_svg', {
      credentials: 'same-origin',
      method: 'post',
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ materials_svg_paths: materialsSvgPaths })
    }).then((response) => {
      return response.status == 201 ? response.json() : {}
    }).catch((errorMessage) => {
      console.log(errorMessage);
    });

    return promise;
  }
}
