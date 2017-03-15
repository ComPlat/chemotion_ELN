import alt from '../alt';

import ContainerActions  from '../actions/ContainerActions';

class ContainerStore{
  constructor(){
    this.state = {
      treeData: []
    }

    this.bindListeners({
      handleFetchTree: ContainerActions.fetchTree
    })
  }

  handleFetchTree(result){
    this.state.treeData = result;
  }
}

export default alt.createStore(ContainerStore, 'ContainerStore');
