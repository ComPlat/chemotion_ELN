import alt from '../alt';
import UIStore from './UIStore';

import ContainerActions  from '../actions/ContainerActions';

class ContainerStore{
  constructor(){
    this.state = {
      treeData: []
    }

    this.bindListeners({
      handleFetchTree: ContainerActions.fetchTree,
      handleUpdateTree: ContainerActions.updateTree,
      handleInitTree: ContainerActions.initTree,
    })
  }

  handleFetchTree(result){
    this.waitFor(UIStore.dispatchToken);
    this.state.treeData = result;
  }

  handleInitTree(type){
    const {currentCollection} = UIStore.getState();
    this.waitFor(UIStore.dispatchToken);
    ContainerActions.fetchTree(currentCollection.id, type)
  }

  handleUpdateTree(treeData){
    this.state.treeData = treeData;
  }

}

export default alt.createStore(ContainerStore, 'ContainerStore');
