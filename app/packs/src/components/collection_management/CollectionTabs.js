import React from 'react';
import Tree from 'react-ui-tree';
import { Button, FormControl, Modal, Nav, NavItem } from 'react-bootstrap';
import { isEmpty } from 'lodash';
import CollectionStore from '../stores/CollectionStore';
import CollectionActions from '../actions/CollectionActions';
import TabLayoutContainer from '../TabLayoutContainer';
import UserStore from '../stores/UserStore';
import { filterTabLayout, getArrayFromLayout } from '../ElementDetailSortTab';

export default class CollectionTabs extends React.Component {
  constructor(props) {
    super(props);

    this.state = {
      profileData: {},
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
    this.onUserStoreChange = this.onUserStoreChange.bind(this);
  }

  componentDidMount() {
    CollectionStore.listen(this.onStoreChange);
    CollectionActions.fetchUnsharedCollectionRoots();
    UserStore.listen(this.onUserStoreChange);
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

  onUserStoreChange(state) {
    const data = (state.profile && state.profile.data) || {};
    this.setState({ profileData: data });
  }

  onClickNode(node) {
    this.setState({ currentCollection: node });
    this.handleSelectModalOptions(this.state.selectModal);
  }

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
    const profileData = this.state.profileData;
    const profileLayout = (profileData && profileData[`layout_detail_${currentTab}`]) || {};
    const availableTabs = (profileLayout && Object.keys(profileLayout)) || {};
    if (!isEmpty(node.tabs_segment[currentTab])) {
      layout = node.tabs_segment[currentTab];
    } else {
      layout = profileLayout;
    }
    const { visible, hidden } = getArrayFromLayout(layout, availableTabs);
    layout = { visible, hidden };
    this.setState({ layout });
    this.clickedOnBack();
  }

  handleSave() {
    const { currentCollection } = this.state;
    const layout = filterTabLayout(this.layout.state);
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
