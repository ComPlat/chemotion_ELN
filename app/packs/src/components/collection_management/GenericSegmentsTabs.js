import React from 'react';
import Tree from 'react-ui-tree';
import { Button, ListGroup, ListGroupItem, Modal } from 'react-bootstrap';
import CollectionStore from '../stores/CollectionStore';
import CollectionActions from '../actions/CollectionActions';
import Immutable from 'immutable';
import TabLayoutContainer from '../TabLayoutContainer';
import { isEmpty } from 'lodash';

export default class GenericSegmentsTabs extends React.Component {
  constructor(props) {
    super(props);

    this.state = {
      showModal: false,
      currentCollectionId: 0,
      layout: {},
      tree: {
        label: 'My Collections',
        id: -1,
        children: [{}]
      },
      currentTab: 'sample',
      currentNode: {}
    };

    this.onStoreChange = this.onStoreChange.bind(this);
    this.handleSave = this.handleSave.bind(this);
  }

  componentDidMount() {
    CollectionStore.listen(this.onStoreChange);
    CollectionActions.fetchUnsharedCollectionRoots();
  }

  componentWillUnmount() {
    CollectionStore.unlisten(this.onStoreChange);
  }

  onStoreChange(state) {
    let children = state.unsharedRoots.length > 0 ? state.unsharedRoots : [{}];

    this.setState({
      tree: {
        label: 'My Collections',
        id: -1,
        children: children
      }
    });
  }

  onClickNode(node) {
    this.setState({ currentCollectionId: node.id });
    this.handleModalOptions(this.state.showModal);
  }

  getArrayFromLayout = (layout, availableTabs) => {
    const layoutKeys = Object.keys(layout);
    const enabled = availableTabs.filter(val => layoutKeys.includes(val));
    const leftover = availableTabs.filter(val => !layoutKeys.includes(val));
    const visible = [];
    const hidden = [];

    enabled.forEach((key) => {
      const order = layout[key];
      if (order < 0) { hidden[Math.abs(order)] = key; }
      if (order > 0) { visible[order] = key; }
    });

    leftover.forEach(key => hidden.push(key));

    let first = null;
    if (visible.length === 0) {
      first = hidden.filter(n => n !== undefined)[0];
      if (first) {
        visible.push(first);
      }
    }
    if (hidden.length === 0) {
      hidden.push('hidden');
    }

    return {
      visible: Immutable.List(visible.filter(n => n !== undefined)),
      hidden: Immutable.List(hidden.filter(n => (n !== undefined && n !== first)))
    };
  };

  handleChange(tree) {
    this.setState({
      tree: tree
    });
  }

  onClicked(node) {
    let layout = {};
    if (!isEmpty(node.tabs_segment['sample'])){
      layout = node.tabs_segment['sample'];
      // layout = node.tabs_segment[this.state.currentTab];
    } else {
      layout = {
        analyses: -1,
        literature: 3,
        properties: 1,
        qc_curation: 2,
        references: -3,
        results: -2
      };
    }
    const availableTabs = ['properties', 'analyses', 'references', 'results', 'qc_curation'];
    const { visible, hidden } = this.getArrayFromLayout(layout, availableTabs);
    layout = { visible: visible, hidden: hidden };
    this.setState({ layout, currentNode: node });
    this.onClickNode(node);
  }

  handleModalOptions(showModal) {
    this.setState({ showModal: !showModal });
  }

  currentTab(key){
    const tabTitles = {
      0: 'sample',
      1: 'reaction',
      2: 'wellplate',
      3: 'screen'
    };
    this.setState({ currentTab: tabTitles[key] });
  }

  handleSave() {
    const { visible, hidden } = this.layout.state;
    const { currentCollectionId } = this.state;
    const layout = {};
    visible.forEach((value, index) => {
      layout[value] = (index + 1);
    });
    hidden.filter(val => val !== 'hidden').forEach((value, index) => {
      layout[value] = (-index - 1);
    });
    // const layoutSegments = { [this.state.currentTab]: layout };
    const layoutSegments = { sample: layout };
    const params = { layoutSegments, currentCollectionId };
    CollectionActions.createTabsSegment(params);
    this.handleModalOptions(this.state.showModal);
    this.state.tree.children.find(c => c.id === currentCollectionId).tabs_segment = layoutSegments;
  }

  renderNode(node) {
    if (!Object.keys(node).length == 0) {
      return (
        <div>
          <span className='node'>
            <ListGroup>
              <ListGroupItem action onClick={() => this.onClicked(node)} style={{ width: 280, height: 35 }}>
                {node.label}
              </ListGroupItem>
            </ListGroup>
          </span>
        </div>
      );
    }
  }

  render() {
    const { showModal, tree, layout } = this.state;
    const tabTitlesMap = {
      qc_curation: 'qc curation',
      computed_props: 'computed props',
      nmr_sim: 'NMR Simulation'
    };
    const isElementDetails = true;
    return (
      <div className="tree">
        <Tree
          paddingLeft={20}
          tree={tree}
          isElementDetails
          onChange={this.handleChange.bind(this)}
          renderNode={this.renderNode.bind(this)}
        />
        <Modal animation show={showModal}>
          <Modal.Header>
            <Modal.Title>Sample Tab Layout</Modal.Title>
          </Modal.Header>
          <Modal.Body>
            <div>
              <div>
                <TabLayoutContainer
                  visible={layout.visible}
                  hidden={layout.hidden}
                  tabTitles={tabTitlesMap}
                  isElementDetails
                  ref={(n) => { this.layout = n; }}
                />
              </div>
            </div>
          </Modal.Body>
          <Modal.Footer style={{ textAlign: 'left' }}>
            <Button bsStyle="warning" onClick={this.handleSave}>Save</Button>
            <Button bsStyle="primary" onClick={() => this.handleModalOptions(showModal)}>Close</Button>
          </Modal.Footer>
        </Modal>
      </div>
    );
  }
}
