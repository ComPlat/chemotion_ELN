import React from 'react';
import Tree from 'react-ui-tree';
import {
  Button, Form, Modal, Col
} from 'react-bootstrap';
import _ from 'lodash';
import CollectionStore from 'src/stores/alt/stores/CollectionStore';
import CollectionActions from 'src/stores/alt/actions/CollectionActions';
import TabLayoutContainer from 'src/apps/mydb/elements/tabLayout/TabLayoutContainer';
import UserStore from 'src/stores/alt/stores/UserStore';
import UserActions from 'src/stores/alt/actions/UserActions';
import { filterTabLayout, getArrayFromLayout } from 'src/utilities/CollectionTabsHelper';

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
      layouts: [],
      tree: {
        label: 'My Collections',
        id: -1,
        children: []
      },
    };
    this.tabRef = [];

    this.onStoreChange = this.onStoreChange.bind(this);
    this.onClickCollection = this.onClickCollection.bind(this);
    this.clickedOnBack = this.clickedOnBack.bind(this);
    this.onUserStoreChange = this.onUserStoreChange.bind(this);

    this.handleChange = this.handleChange.bind(this);
    this.renderNode = this.renderNode.bind(this);
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
    const { tree } = this.state;
    this.setState({
      tree: {
        ...tree,
        children: state.unsharedRoots,
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

  onClickCollection(node) {
    const { addInventoryTab } = this.props;
    const { layouts, profileData } = this.state;
    this.setState({ currentCollection: node });
    this.handleModalOptions(this.state.showModal);
    elements.forEach((element, index) => {
      let layout = {};
      if (_.isEmpty(node.tabs_segment[element.name])) {
        layout = (profileData && profileData[`layout_detail_${element.name}`]) || {};
      } else {
        layout = node.tabs_segment[element.name];
      }
      const { visible, hidden } = getArrayFromLayout(layout, element.name, addInventoryTab);
      layout = { visible, hidden };
      layouts[index] = layout;
    });

    this.setState({ layouts });
  }

  handleChange(tree) {
    this.setState({
      tree
    });
  }

  handleModalOptions(showModal) {
    this.setState({ showModal: !showModal });
  }

  handleSave(showModal) {
    const cCol = this.state.currentCollection;
    let layoutSegments = {};
    elements.forEach((_e, index) => {
      const layout = filterTabLayout(this.tabRef[index].state);
      layoutSegments = { ...layoutSegments, [elements[index].name]: layout };
    });
    const params = { layoutSegments, currentCollectionId: cCol.id };
    CollectionActions.createTabsSegment(params);
    this.setState({ showModal: !showModal });
    if (cCol.ancestry) {
      this.state.tree.children.find((c) => c.id === parseInt(cCol.ancestry)).children.find((ch) => ch.id === cCol.id).tabs_segment = layoutSegments;
    } else {
      this.state.tree.children.find((c) => c.id === cCol.id).tabs_segment = layoutSegments;
    }
  }

  clickedOnBack() {
    this.handleModalOptions(this.state.showModal);
  }

  renderNode(node) {
    if (node.is_locked || node.id < 1) {
      return (
        <div className="ms-3 mb-2">{node.label}</div>
      );
    }

    return (
      <div className="d-flex mb-2">
        <div className="align-self-center ms-3">{node.label}</div>
        <Button
          className="ms-2"
          size="sm"
          variant="primary"
          onClick={() => this.onClickCollection(node)}
          title="Click to edit collection tab sorting"
        >
          <i className="fa fa-pencil" />
        </Button>
      </div>
    );
  }

  render() {
    const { tree, showModal, layouts } = this.state;
    const tabTitlesMap = {
      qc_curation: 'QC & curation',
      computed_props: 'computed props',
      nmr_sim: 'NMR Simulation'
    };
    return (
      <div className="tree">
        <Tree
          paddingLeft={30}
          tree={tree}
          isElementDetails
          onChange={this.handleChange}
          renderNode={this.renderNode}
        />

        <Modal
          size="lg"
          centered
          animation
          show={showModal}
          onHide={() => this.handleModalOptions(showModal)}
        >
          <Modal.Header closeButton>
            <Modal.Title>{this.state.currentCollection.label}</Modal.Title>
          </Modal.Header>
          <Modal.Body>
            {layouts.map((lay, index) => {
              const callbackRef = (node) => this.tabRef[index] = node;
              return (
                <div key={elements[index].name}>
                  <Col md={6}>
                    <p className="collection-tag-element">{elements[index].label}</p>
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
            })}
          </Modal.Body>
          <Modal.Footer>
            <div className="alert alert-info" role="alert">
              <p>
                For the selected collection you can adjust the visibility of segment tabs and their order for each of the above items.
                Drag and drop to select the order of segment tab layout.
                Items in the white area will be displayed in the order they are placed and the grey area items will be hidden.
              </p>
            </div>
            <Button variant="primary" onClick={() => this.handleSave(showModal)}>Save</Button>
          </Modal.Footer>
        </Modal>
      </div>
    );
  }
}
