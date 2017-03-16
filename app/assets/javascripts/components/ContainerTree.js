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
      treeDate: []
    }
    this.onChange = this.onChange.bind(this)
  }

  componentDidMount() {
   ContainerStore.listen(this.onChange)
   ContainerActions.fetchTree(1)
  }

  componentWillUnmount() {
    ContainerStore.unlisten(this.onChange);
  }

  onChange(state){
    this.setState(state)
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
