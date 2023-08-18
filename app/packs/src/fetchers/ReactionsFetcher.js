import 'whatwg-fetch';
import Immutable from 'immutable';

import BaseFetcher from 'src/fetchers/BaseFetcher';
import Reaction from 'src/models/Reaction';
import AttachmentFetcher from 'src/fetchers/AttachmentFetcher';
import Literature from 'src/models/Literature';
import GenericElsFetcher from 'src/fetchers/GenericElsFetcher';

// TODO: Extract common base functionality into BaseFetcher
export default class ReactionsFetcher {
  static fetchById(id) {
    return fetch(`/api/v1/reactions/${id}.json`, {
      credentials: 'same-origin'
    }).then(response => response.json())
      .then((json) => {
        if (json.hasOwnProperty("reaction")) {
          const reaction = new Reaction(json.reaction);
          if (json.literatures && json.literatures.length > 0) {
            const tliteratures = json.literatures.map(literature => new Literature(literature));
            const lits = tliteratures.reduce((acc, l) => acc.set(l.literal_id, l), new Immutable.Map());
            reaction.literatures = lits;
          }
          reaction.updateMaxAmountOfProducts();
          return reaction;
        }
        const rReaction = new Reaction(json.reaction);
        if (json.error) {
          rReaction.id = `${id}:error:Reaction ${id} is not accessible!`;
        }
        return rReaction;
      }).catch((errorMessage) => {
        console.log(errorMessage);
      });
  }

  static fetchByCollectionId(id, queryParams = {}) {
    return BaseFetcher.fetchByCollectionId(id, queryParams, 'reactions', Reaction);
  }

  static findByShortLabel(shortLabel) {
    return fetch(
      `/api/v1/reactions/findByShortLabel/${shortLabel}.json`,
      {
        credentials: 'same-origin',
        headers: { 'Content-Type': 'application/json' }
      }
    ).then((response) => response.json()).catch(errorMessage => console.log(errorMessage))
  }

  static create(reaction, method = 'post') {
    const reactionFiles = AttachmentFetcher.getFileListfrom(reaction.container);
    let productsFiles = [];
    reaction.products.forEach((prod) => {
      const files = AttachmentFetcher.getFileListfrom(prod.container);
      productsFiles = [...productsFiles, ...files];
    });
    const allFiles = reactionFiles.concat(productsFiles);

    const promise = () => fetch(`/api/v1/reactions/${method === 'post' ? '' : reaction.id}`, {
      credentials: 'same-origin',
      method,
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(reaction.serialize())
    }).then(response => response.json())
      .then(json => GenericElsFetcher.uploadGenericFiles(reaction, json.reaction.id, 'Reaction')
      .then(()=> ReactionsFetcher.updateAnnotationsInReaction(reaction))
        .then(() => this.fetchById(json.reaction.id))).catch((errorMessage) => {
          console.log(errorMessage);
        });

    if (allFiles.length > 0) {
      let tasks = [];
      allFiles.forEach(file => tasks.push(AttachmentFetcher.uploadFile(file).then()));
      return Promise.all(tasks).then(() => {
        return promise();
      });
    }    
   
    return promise();
  } 

  static updateAnnotationsInReaction(reaction){
     const tasks=[];
     reaction.products.forEach( e =>  tasks.push(BaseFetcher.updateAnnotationsInContainer(e)));
     return Promise.all(tasks);
  }

  static update(reaction) {    
    return ReactionsFetcher.create(reaction, 'put');
  }
}
