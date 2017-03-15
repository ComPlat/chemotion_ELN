import alt from '../alt';

class ContainerActions{

  updateTree(tree){
    return tree;
  }

  fetchTree(){
    return [{title: 'Test Tree'}];
  }
}

export default alt.createActions(ContainerActions);
