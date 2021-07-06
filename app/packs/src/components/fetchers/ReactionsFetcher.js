import 'whatwg-fetch';
import { indexOf, split } from 'lodash';
import Immutable from 'immutable';

import BaseFetcher from './BaseFetcher';
import Reaction from '../models/Reaction';
import UIStore from '../stores/UIStore';
import NotificationActions from '../actions/NotificationActions';
import AttachmentFetcher from './AttachmentFetcher';
import Literature from '../models/Literature';

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

  static fetchByCollectionId(id, queryParams = {}, isSync = false) {
    return BaseFetcher.fetchByCollectionId(id, queryParams, isSync, 'reactions', Reaction);
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
        'Accept': 'application/json',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(reaction.serialize())
    }).then((response) => {
      return response.json()
    }).then((json) => {
      return new Reaction(json.reaction);
    }).catch((errorMessage) => {
      console.log(errorMessage);
    });

    if (allFiles.length > 0) {
      return AttachmentFetcher.uploadFiles(allFiles)().then(() => promise());
    }
    return promise();
  }

  static update(reaction) {
    return ReactionsFetcher.create(reaction, 'put');
  }

  static importFromChemScanner({ reactions, molecules }) {
    const promise = fetch('/api/v1/reactions/import_chemscanner', {
      credentials: 'same-origin',
      method: 'post',
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        reactions,
        molecules,
        collection_id: UIStore.getState().currentCollection.id,
      })
    }).then(response => response.json()).catch((errorMessage) => {
      console.log(errorMessage);
    });

    return promise;
  }
}
