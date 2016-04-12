import 'whatwg-fetch';

export default class ReactionSvgFetcher {

  static fetchByMaterialsSvgPaths(materialsSvgPaths, label) {
    let promise = fetch('/api/v1/reaction_svg', {
      credentials: 'same-origin',
      method: 'post',
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        materials_svg_paths: materialsSvgPaths,
        label
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
