import alt from '../alt';

import ContainerTreeFetcher from '../fetchers/ContainerTreeFetcher'

class ContainerActions{

  fetchTree(id, type){
    return (dispatch) => { ContainerTreeFetcher.fetchByCollectionId(id, type)
      .then((result) => {
        dispatch(result.tree);
      }).catch((errorMessage) => {
        console.log(errorMessage);
      });};
  }

  initTree(type){
    return type
  }

  updateTree(collection_id, type, tree){
    return (dispatch) => { ContainerTreeFetcher.updateTree(collection_id, type, tree)
      .then((result) => {
        dispatch(result.tree);
      }).catch((errorMessage) => {
        console.log(errorMessage);
      });};
  }
}

export default alt.createActions(ContainerActions);
