import React from 'react';
import Tree from 'react-ui-tree';
import { Button, FormControl, Modal, Nav, NavItem } from 'react-bootstrap';
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
      selectModal: false,
      currentCollection: {},
      layout: {},
      tree: {
        label: 'My Collections',
        id: -1,
        children: [{}]
      },
      currentTab: 'sample'
    };

    this.onStoreChange = this.onStoreChange.bind(this);
    this.handleSave = this.handleSave.bind(this);
    this.handleSelectNav = this.handleSelectNav.bind(this);
    this.clickedOnBack = this.clickedOnBack.bind(this);
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
    this.setState({ currentCollection: node });
    this.handleSelectModalOptions(this.state.selectModal);
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
    this.setState({ currentCollection: node });
    this.onClickNode(node);
  }

  handleModalOptions(showModal) {
    this.setState({ showModal: !showModal });
  }

  handleSelectModalOptions(selectModal) {
    this.setState({ selectModal: !selectModal });
  }

  selectCurrentTab(key) {
    const tabTitles = {
      0: 'sample',
      1: 'reaction',
      2: 'wellplate',
      3: 'screen'
    };
    this.setState({ currentTab: tabTitles[key] });
    return tabTitles[key];
  }

  clickedOnBack() {
    this.handleModalOptions(this.state.showModal);
    this.handleSelectModalOptions(this.state.selectModal);
  }

  handleSelectNav(eventKey) {
    const currentTab = this.selectCurrentTab(eventKey);
    let layout = {};
    const node = this.state.currentCollection;
    if (!isEmpty(node.tabs_segment[currentTab])){
      layout = node.tabs_segment[currentTab];
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
    layout = { visible, hidden };
    this.setState({ layout });
    this.clickedOnBack();
  }

  handleSave() {
    const { visible, hidden } = this.layout.state;
    const { currentCollection } = this.state;
    const layout = {};
    visible.forEach((value, index) => {
      layout[value] = (index + 1);
    });
    hidden.filter(val => val !== 'hidden').forEach((value, index) => {
      layout[value] = (-index - 1);
    });
    const layoutSegments = { [this.state.currentTab]: layout };
    const currentCollectionId = currentCollection.id;
    const params = { layoutSegments, currentCollectionId };
    CollectionActions.createTabsSegment(params);
    this.handleModalOptions(this.state.showModal);
    this.state.tree.children.find(c => c.id === currentCollectionId).tabs_segment = layoutSegments;
  }

  label(node) {
    if (node.label === 'My Collections') {
      return (
        <div className="root-label">My Collections</div>
      );
    }
    return (
      <FormControl className="collection-label" type="text" value={node.label || ''} disabled/>
    );
  }

  isActive(node) {
    return node === this.state.active ? 'node is-active' : 'node';
  }

  renderNode(node) {
    if (!Object.keys(node).length == 0) {
      if (node.is_locked) {
        return (
          <span className={this.isActive(node)} onClick={this.onClickNode.bind(this, node)}>
            {this.label(node)}
          </span>
        );
      }
      return (
        <span className={this.isActive(node)} onClick={this.onClickNode.bind(this, node)}>
          {this.label(node)}
        </span>
      );
    }
  }

  render() {
    const { showModal, tree, layout, selectModal } = this.state;
    const tabTitlesMap = {
      qc_curation: 'qc curation',
      computed_props: 'computed props',
      nmr_sim: 'NMR Simulation'
    };
    const isElementDetails = true;
    return (
      <div className="tree">
        <Tree
          paddingLeft={30}
          tree={tree}
          isElementDetails
          onChange={this.handleChange.bind(this)}
          renderNode={this.renderNode.bind(this)}
        />
        <Modal animation show={showModal}>
          <Modal.Header>
            <Modal.Title>{this.state.currentTab} tab layout</Modal.Title>
          </Modal.Header>
          <Modal.Body style={{ paddingBottom: '2px' }}>
            <div style={{ paddingBottom: '2px' }}>
              <TabLayoutContainer
                visible={layout.visible}
                hidden={layout.hidden}
                tabTitles={tabTitlesMap}
                isElementDetails
                ref={(n) => { this.layout = n; }}
              />
            </div>
            <hr />
            <div className="alert alert-info" role="alert">
              <p style={{ fontSize: '11px' }}>
                Drag and drop to select the order of segment tab layout. Items in the white area will be displayed in the order they are placed and the grey area items will be hidden.
              </p>
            </div>
          </Modal.Body>
          <Modal.Footer style={{ textAlign: 'left' }}>
            <Button bsStyle="primary" onClick={this.clickedOnBack}>Back</Button>
            <Button bsStyle="warning" onClick={this.handleSave}>Save</Button>
            <Button bsStyle="primary" onClick={() => this.handleModalOptions(showModal)}>Close</Button>
          </Modal.Footer>
        </Modal>
        <Modal animation show={selectModal}>
          <Modal.Header>
            <Modal.Title>{this.state.currentCollection.label}</Modal.Title>
          </Modal.Header>
          <Modal.Body style={{ paddingBottom: '2px' }}>
            <Nav bsStyle="pills" stacked onSelect={this.handleSelectNav}>
              <NavItem eventKey={0}>Sample</NavItem>
              <NavItem eventKey={1}>Reaction</NavItem>
              <NavItem eventKey={2}>Wellplate</NavItem>
              <NavItem eventKey={3}>Screen</NavItem>
            </Nav>
            <hr />
            <div className="alert alert-info" role="alert">
              <p style={{ fontSize: '10.5px' }}>For the selected collection you can adjust the visibility of segment tabs and their order for each of the above items.</p>
            </div>
          </Modal.Body>
          <Modal.Footer style={{ textAlign: 'left' }}>
            <Button bsStyle="primary" onClick={() => this.handleSelectModalOptions(selectModal)}>Close</Button>
          </Modal.Footer>
        </Modal>
      </div>
    );
  }
}
