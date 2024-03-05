import 'whatwg-fetch';

export default class ReactionSvgFetcher {

  static fetchByMaterialsSvgPaths(materialsSvgPaths, temperature, solvents, duration, conditions) {
    const promise = fetch('/api/v1/reaction_svg', {
      credentials: 'same-origin',
      method: 'post',
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        materials_svg_paths: materialsSvgPaths,
        temperature,
        duration,
        solvents,
        conditions: (typeof conditions === 'string') ? conditions : '',
      })
    }).then((response) => {
      return response.status == 201 ? response.json() : {}
    }).catch((errorMessage) => {
      console.log(errorMessage);
    });

    return promise;
  }
}
