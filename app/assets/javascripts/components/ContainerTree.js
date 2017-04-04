import React, { Component } from 'react';
import {Button, Table, Glyphicon} from 'react-bootstrap';
import {DragDropContext} from 'react-dnd';
import { SortableTreeWithoutDndContext as SortableTree } from 'react-sortable-tree';
import {toggleExpandedForAll} from 'react-sortable-tree';
import UIStore from './stores/UIStore';
import ContainerStore from './stores/ContainerStore';
import ContainerActions from './actions/ContainerActions'

export default class ContainerTree extends Component {

  constructor(props) {
    super(props)

    this.state = {
      treeData: [],
      saved: true,
      currentCollectionId: null
    }

    this.onChangeTree = this.onChangeTree.bind(this)
    this.onChangeUI = this.onChangeUI.bind(this)
    this.expandAll = this.expandAll.bind(this);
    this.collapseAll = this.collapseAll.bind(this);
  }

  componentDidMount() {
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
      currentCollection: state.currentCollection.id
    })
  }

  draggable(tree_info){
    return tree_info.node.subtitle &&
      tree_info.node.subtitle.endsWith("(attachment)")
  }

  droppable(tree_info){
    return tree_info.nextParent && tree_info.nextParent.subtitle &&
      tree_info.nextParent.subtitle.endsWith("(dataset)")
  }

  expand(expanded) {
    this.setState({
      treeData: toggleExpandedForAll({
          treeData: this.state.treeData,
          expanded,
        }),
      });
  }

  expandAll() {
    this.expand(true);
  }

  collapseAll() {
    this.expand(false);
  }

  handleSave(){
    const {currentCollectionId, treeData} = this.state
    const {type} = this.props
    ContainerActions.updateTree(2, type, treeData)
    this.state.saved = true
  }

  onMoveNode(tree_info){
    this.setState({
      saved: false
    })
  }

  render() {
    let {treeData, saved} = this.state
    let {type} = this.props

    return (
        <div>
          <Table className="elements" bordered hover style={{marginBottom: 0}}>
            <thead><tr>
            <th className="check" style={{verticalAlign: "middle"}}>
            {saved
              ? <Button bsSize="xsmall" bsStyle="success">
                  <Glyphicon glyph="floppy-saved" />
                </Button>
              : <Button bsSize="xsmall" bsStyle="danger" onClick={() => this.handleSave()}>
                  <Glyphicon glyph="floppy-remove" />
                  </Button>
            }
            </th>
            <th colSpan={3} style={{verticalAlign: "middle", position: "relative"}}>
              <span style={{position: "absolute", top: "30%"}}>Analyses of all {type.replace('_', ' ')}s</span>
              <div style={{display: "initial", verticalAlign: "middle", width: "100%"}}>
                <div style={{float: "right"}}>
                <Button bsStyle="info" style={{width: "120px", padding: "5px"}}
                    onClick={() => this.expandAll()}>
                  Expand all
                </Button>
                &nbsp;&nbsp;
                <Button bsStyle="info" style={{width: "120px", padding: "5px"}}
                    onClick={() => this.collapseAll()}>
                  Collapse all
                </Button>
                </div>
              </div>
            </th>
          </tr></thead>
          </Table>
          <SortableTree
            style={{height: 800}}
                  treeData={treeData}
                  onChange={treeData => this.onChangeTree({treeData})}
                  canDrag={this.draggable}
                  canDrop={this.droppable}
                  onMoveNode={this.onMoveNode.bind(this)}
            />

        </div>
      );
  }
}
