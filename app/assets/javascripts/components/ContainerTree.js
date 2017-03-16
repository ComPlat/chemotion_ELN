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
  }

  onChangeUI(state){
    this.setState({
      currentCollection: state.currentCollection
    })
    if(this.state.currentCollection != null){
      ContainerActions.fetchTree(this.state.currentCollection.id)
    }
  }

  render() {

    return (
      <div style={{ height: 800 }}>
        <SortableTree
          treeData={this.state.treeData}
          onChange={treeData => this.setState({treeData})}
          />
      </div>
        );
  }
}
