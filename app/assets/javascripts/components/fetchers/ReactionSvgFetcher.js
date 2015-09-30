import 'whatwg-fetch';

export default class ReactionSvgFetcher {

  static fetchByMaterialsInchikeys(materialsInchikeys) {
    let promise = fetch('/api/v1/reaction_svg', {
      credentials: 'same-origin',
      method: 'post',
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        materials_inchikeys: materialsInchikeys
      })
    }).then(response => {
      return response.json()
    })
      .catch(errorMessage => {
        console.log(errorMessage);
      });

    return promise;
  }

  static fetchByReactionId(reaction_id) {
    let promise = fetch('/api/v1/reaction_svg?reaction_id=' + reaction_id, {
      credentials: 'same-origin'
    }).then(response => {
      return response.json()
    })
      .catch(errorMessage => {
        console.log(errorMessage);
      });

    return promise;
  }
}