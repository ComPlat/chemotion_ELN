import React, { Component } from 'react';
import SortableTree from 'react-sortable-tree';
import ContainerStore from './stores/ContainerStore';
import ContainerActions from './actions/ContainerActions'
export default class ContainerTree extends Component {

  constructor(props) {
    super(props);

  }

  componentDidMount() {
    ContainerActions.fetchTree();
  }

  componentWillUnmount() {
  }

  onChange(data){

  }

  render() {
    const {treeData} = ContainerStore.getState()
    return (
      <div style={{ height: 800 }}>
                <SortableTree
                    treeData={treeData}
                    onChange={treeData => this.onChange(treeData)}
                />
            </div>

        );
  }
}
