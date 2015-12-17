import 'whatwg-fetch';

export default class ReactionSvgFetcher {

  static fetchByMaterialsInchikeys(materialsInchikeys, label) {
    let promise = fetch('/api/v1/reaction_svg', {
      credentials: 'same-origin',
      method: 'post',
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        materials_inchikeys: materialsInchikeys,
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
