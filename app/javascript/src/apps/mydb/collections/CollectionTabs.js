import React from 'react';
import Tree from 'react-ui-tree';
import {
  Button, Modal, Col, Row
} from 'react-bootstrap';
import _ from 'lodash';
import { List } from 'immutable';
import CollectionStore from 'src/stores/alt/stores/CollectionStore';
import CollectionActions from 'src/stores/alt/actions/CollectionActions';
import TabLayoutEditor from 'src/apps/mydb/elements/tabLayout/TabLayoutEditor';
import UserStore from 'src/stores/alt/stores/UserStore';
import UserActions from 'src/stores/alt/actions/UserActions';
import { capitalizeWords } from 'src/utilities/textHelper';
import { filterTabLayout, getArrayFromLayout } from 'src/utilities/CollectionTabsHelper';
import { allElnElmentsWithLabel } from 'src/apps/generic/Utils';

export default class CollectionTabs extends React.Component {
  constructor(props) {
    super(props);

    this.state = {
      profileData: {},
      showModal: false,
      currentCollection: {},
      layouts: allElnElmentsWithLabel.reduce((acc, { name }) => {
        acc[name] = { visible: List(), hidden: List() };
        return acc;
      }, {}),
      tree: {
        label: 'My Collections',
        id: -1,
        children: []
      },
    };

    this.onStoreChange = this.onStoreChange.bind(this);
    this.onClickCollection = this.onClickCollection.bind(this);
    this.onUserStoreChange = this.onUserStoreChange.bind(this);

    this.handleChange = this.handleChange.bind(this);
    this.renderNode = this.renderNode.bind(this);
    this.handleSave = this.handleSave.bind(this);
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
    const { profileData } = this.state;

    const layouts = allElnElmentsWithLabel.reduce((acc, { name }) => {
      let layout;
      if (_.isEmpty(node.tabs_segment[name])) {
        layout = (profileData && profileData[`layout_detail_${name}`]) || {};
      } else {
        layout = node.tabs_segment[name];
      }
      acc[name] = getArrayFromLayout(layout, name, false);
      return acc;
    }, {});

    this.setState({
      currentCollection: node,
      showModal: true,
      layouts,
    });
  }

  handleChange(tree) {
    this.setState({
      tree
    });
  }

  handleSave() {
    const { currentCollection: cCol, layouts } = this.state;
    const layoutSegments = allElnElmentsWithLabel.reduce((acc, { name }) => {
      const layout = filterTabLayout(layouts[name]);
      acc[name] = layout;
      return acc;
    }, {});
    CollectionActions.createTabsSegment({ layoutSegments, currentCollectionId: cCol.id });
    this.setState({ showModal: false });
    if (cCol.ancestry) {
      this.state.tree.children.find((c) => c.id === parseInt(cCol.ancestry)).children.find((ch) => ch.id === cCol.id).tabs_segment = layoutSegments;
    } else {
      this.state.tree.children.find((c) => c.id === cCol.id).tabs_segment = layoutSegments;
    }
  }

  renderNode(node) {
    if (node.is_locked || node.id < 1) {
      return (
        <div className="ms-3 mb-2">{node.label}</div>
      );
    }

    return (
      <div className="d-flex align-items-center justify-content-between mb-2 bg-dark-subtle">
        <div className="ms-3">{node.label}</div>
        <Button
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
    const { currentCollection, tree, showModal, layouts } = this.state;
    const tabTitlesMap = {
      qc_curation: 'QC & curation',
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
          onHide={() => this.setState({ showModal: false })}
        >
          <Modal.Header closeButton>
            <Modal.Title>{currentCollection.label}</Modal.Title>
          </Modal.Header>
          <Modal.Body>
            <Row>
              {allElnElmentsWithLabel.map(({ name, label }) => (
                <Col key={name}>
                  <h4>{label}</h4>
                  <TabLayoutEditor
                    visible={layouts[name].visible}
                    hidden={layouts[name].hidden}
                    getItemComponent={({ item }) => (
                      <div>{tabTitlesMap[item] ?? capitalizeWords(item)}</div>
                    )}
                    onLayoutChange={(visible, hidden) => {
                      this.setState(({ layouts }) => ({
                        layouts: {
                          ...layouts,
                          [name]: { visible, hidden }
                        }
                      }));
                    }}
                  />
                </Col>
              ))}
            </Row>
          </Modal.Body>
          <Modal.Footer>
            <div className="alert alert-info" role="alert">
              <p>
                For the selected collection you can adjust the visibility of segment tabs and their order for each of the above items.
                Drag and drop to select the order of segment tab layout.
                Items in the white area will be displayed in the order they are placed and the grey area items will be hidden.
              </p>
            </div>
            <Button variant="primary" onClick={this.handleSave}>Save</Button>
          </Modal.Footer>
        </Modal>
      </div>
    );
  }
}
