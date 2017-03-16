import alt from '../alt';

import ContainerTreeFetcher from '../fetchers/ContainerTreeFetcher'

class ContainerActions{

  fetchTree(id){
    return (dispatch) => { ContainerTreeFetcher.fetchByCollectionId(id)
      .then((result) => {
        dispatch(result.tree);
      }).catch((errorMessage) => {
        console.log(errorMessage);
      });};
  }

  updateTree(tree){
    return tree;
  }
}

export default alt.createActions(ContainerActions);
