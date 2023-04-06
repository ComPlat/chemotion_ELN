import React from 'react';
import Tree from 'react-ui-tree';
import { Button, FormControl, Modal, Col } from 'react-bootstrap';
import _ from 'lodash';
import CollectionStore from 'src/stores/alt/stores/CollectionStore';
import CollectionActions from 'src/stores/alt/actions/CollectionActions';
import TabLayoutContainer from 'src/apps/mydb/elements/tabLayout/TabLayoutContainer';
import UserStore from 'src/stores/alt/stores/UserStore';
import UserActions from 'src/stores/alt/actions/UserActions';
import { filterTabLayout, getArrayFromLayout } from 'src/apps/mydb/elements/details/ElementDetailSortTab';

const elements = [
  { name: 'sample', label: 'Sample' },
  { name: 'reaction', label: 'Reaction' },
  { name: 'wellplate', label: 'Wellplate' },
  { name: 'screen', label: 'Screen' },
  { name: 'research_plan', label: 'Research Plan' }
];

export default class CollectionTabs extends React.Component {
  constructor(props) {
    super(props);

    this.state = {
      profileData: {},
      showModal: false,
      currentCollection: {},
      canReset: [],
      layouts: [],
      changedIndexes: [],
      updatedlayouts: [],
      tree: {
        label: 'My Collections',
        id: -1,
        children: [{}]
      },
      currentTab: 'sample'
    };
    this.tabRef = React.createRef();
    this.changedElements = React.createRef();
    this.tabRef = [];
    this.changedElements = [];

    this.onStoreChange = this.onStoreChange.bind(this);
    this.onClickNode = this.onClickNode.bind(this);
    this.clickedOnBack = this.clickedOnBack.bind(this);
    this.onUserStoreChange = this.onUserStoreChange.bind(this);
  }

  componentDidMount() {
    CollectionStore.listen(this.onStoreChange);
    UserStore.listen(this.onUserStoreChange);
    UserActions.fetchProfile();
    CollectionActions.fetchUnsharedCollectionRoots();
  }

  componentWillUnmount() {
    CollectionStore.unlisten(this.onStoreChange);
    UserStore.unlisten(this.onUserStoreChange);
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
    if (!data) {
      UserActions.fetchProfile();
    }
    this.setState({ profileData: data });
  }

  onClickNode(node) {
    const { layouts, profileData } = this.state;
    this.setState({ currentCollection: node });
    this.handleModalOptions(this.state.showModal);
    let layout = {};
    elements.forEach((element, index) => {
      layout = (profileData && profileData[`layout_detail_${element.name}`]) || {};
      let availableTabs = (layout && Object.keys(layout)) || {};
      let segmentKlasses = (UserStore.getState() && UserStore.getState().segmentKlasses) || [];
      if (!_.isEmpty(node.tabs_segment[element.name])) {
        const nodeTabs = node.tabs_segment[element.name];
        let names = segmentKlasses.filter(s => s.element_klass.name == element.name).map(s => s.label);
        availableTabs = _.uniq(availableTabs.concat(names));
        const { visible, hidden } = getArrayFromLayout(nodeTabs, availableTabs);

        layout = { visible, hidden };
      } else {
        const { visible, hidden } = getArrayFromLayout(layout, availableTabs);
        layout = { visible, hidden };
      }
      layouts[index] = layout;
    });

    this.setState({ layouts });
  }

  handleChange(tree) {
    this.setState({
      tree: tree
    });
  }

  handleCanReset(index, canResetValue) {
    const { canReset } = this.state;
    canReset[index] = canResetValue;
    this.setState({ canReset });
  }

  setLayout(index, layout) {
    const { layouts } = this.state;
    layouts[index] = layout;
    this.setState({ layouts });
  }

  resetLayout() {
    const { profileData, layouts } = this.state;
    elements.map((e, i) => {

      let profileLayout = (profileData && profileData[`layout_detail_${e.name}`]) || {};
      const availableTabs = (profileLayout && Object.keys(profileLayout)) || {};
      const { visible, hidden } = getArrayFromLayout(profileLayout, availableTabs);
      profileLayout = { visible, hidden };
      layouts[i] = profileLayout;
    });
    this.setState({ layouts });
  }

  handleModalOptions(showModal) {
    this.setState({ showModal: !showModal });
  }

  handleSave(showModal) {
    const cCol = this.state.currentCollection;
    let layoutSegments = {};
    elements.map((_e, index) => {
      const layout = filterTabLayout(this.tabRef[index].state);
      layoutSegments = { ...layoutSegments, [elements[index].name]: layout };
    });
    const params = { layoutSegments, currentCollectionId: cCol.id };
    CollectionActions.createTabsSegment(params);
    this.setState({ showModal: !showModal });
    if (cCol.ancestry){
      this.state.tree.children.find(c => c.id === parseInt(cCol.ancestry)).children.find(ch => ch.id === cCol.id).tabs_segment = layoutSegments;
    } else {
      this.state.tree.children.find(c => c.id === cCol.id).tabs_segment = layoutSegments;
    }
  }

  clickedOnBack() {
    this.handleModalOptions(this.state.showModal);
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
    const { tree, showModal, layouts } = this.state;
    const tabTitlesMap = {
      qc_curation: 'qc curation',
      computed_props: 'computed props',
      nmr_sim: 'NMR Simulation'
    };
    return (
      <div className="tree">
        <Tree
          paddingLeft={30}
          tree={tree}
          isElementDetails
          onChange={this.handleChange.bind(this)}
          renderNode={this.renderNode.bind(this)}
        />
        <Modal className="collection-tab-modal" animation show={showModal} onHide={() => this.handleModalOptions(showModal)}>
          <Modal.Header closeButton>
            <Modal.Title>{this.state.currentCollection.label}</Modal.Title>
          </Modal.Header>
          <Modal.Body style={{ paddingTop: '2px', paddingBottom: '2px' }} className="collection-tab-modal-body">
            {layouts.map((lay, index) => {
              var callbackRef = node => this.tabRef[index] = node;
              return (
                <div style={{ textAlign: 'left' }}>
                  <Col md={6}>
                    <p style={{ fontSize: '11px', fontWeight: 'bold' }}>{elements[index].label}</p>
                  </Col>
                  <Col md={12}>
                    <TabLayoutContainer
                      visible={lay.visible}
                      hidden={lay.hidden}
                      tabTitles={tabTitlesMap}
                      isCollectionTab
                      ref={callbackRef}
                    />
                  </Col>
                  &nbsp;
                </div>
              );
             })
            }
          </Modal.Body>
          <Modal.Footer style={{ textAlign: 'left' }}>
            <div className="alert alert-info" role="alert" style={{ width: 'fit-content' }}>
              <p style={{ fontSize: '10.5px' }}>
                For the selected collection you can adjust the visibility of segment tabs and their order for each of the above items.
                Drag and drop to select the order of segment tab layout.
                Items in the white area will be displayed in the order they are placed and the grey area items will be hidden.
              </p>
            </div>
            <Button bsStyle="primary" onClick={() => this.handleSave(showModal)}>Save</Button>
            <Button bsStyle="primary" onClick={() => this.resetLayout()}>Reset</Button>
          </Modal.Footer>
        </Modal>
      </div>
    );
  }
}
