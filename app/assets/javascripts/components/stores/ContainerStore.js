import alt from '../alt';

import ContainerActions  from '../actions/ContainerActions';

class ContainerStore{
  constructor(){
    this.state = {
      treeData: []
    }

    this.bindListeners({
      handleFetchTree: ContainerActions.fetchTree,
      handleUpdateTree: ContainerActions.updateTree
    })
  }

  handleFetchTree(result){
    this.state.treeData = result;
  }

  handleUpdateTree(treeData){
    this.state.treeData = treeData;
  }

}

export default alt.createStore(ContainerStore, 'ContainerStore');
