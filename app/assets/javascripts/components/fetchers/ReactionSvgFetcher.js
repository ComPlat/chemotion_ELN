import 'whatwg-fetch';

export default class ReactionSvgFetcher {

  static fetchByMaterialsSvgPaths(materialsSvgPaths, temperature, solvents) {
    let promise = fetch('/api/v1/reaction_svg', {
      credentials: 'same-origin',
      method: 'post',
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        materials_svg_paths: materialsSvgPaths,
        temperature,
        solvents
      })
    }).then(response => {
      return response.json()
    })
      .catch(errorMessage => {
        console.log(errorMessage);
      });

    return promise;
  }
}
