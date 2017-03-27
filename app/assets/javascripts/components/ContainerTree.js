import React, { Component } from 'react';
import {DragDropContext} from 'react-dnd';
import SortableTree from 'react-sortable-tree';
import UIStore from './stores/UIStore';
import ContainerStore from './stores/ContainerStore';
import ContainerActions from './actions/ContainerActions'

export default class ContainerTree extends Component {

  constructor(props) {
    super(props);
    this.state = {
      currentCollection: null,
      treeDate: []
    }
    this.onChangeTree = this.onChangeTree.bind(this)
    this.onChangeUI = this.onChangeUI.bind(this)
  }

  componentDidMount() {
    UIStore.getState()
    ContainerStore.listen(this.onChangeTree)
    UIStore.listen(this.onChangeUI)
  }

  componentWillUnmount() {
    ContainerStore.unlisten(this.onChangeTree);
    UIStore.unlisten(this.onChangeUI)
  }

  onChangeTree(state){
    this.setState({
      treeData: state.treeData
    })
    ContainerActions.updateTree(this.state.tree)
  }

  onChangeUI(state){
    this.setState({
      currentCollection: state.currentCollection
    })
    if(this.state.currentCollection != null){
      ContainerActions.fetchTree(this.state.currentCollection.id)
    }
  }

  draggable(tree_info){
    return tree_info.node.title.endsWith("(attachment)")
  }

  droppable(tree_info){
    if(tree_info.nextParent!=null){
      return tree_info.nextParent.title.endsWith("(dataset)")
    }else {
      return false
    }
  }

  render() {

    return (
      <div style={{ height: 800 }}>
        <SortableTree
          treeData={this.state.treeData}
          onChange={treeData => this.onChangeTree({treeData})}
          canDrag={this.draggable}
          canDrop={this.droppable}
          />
      </div>
        );
  }
}
