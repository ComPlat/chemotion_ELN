import React from 'react';
import Tree from 'react-ui-tree';
import {
  Button, Modal, Col, Row
} from 'react-bootstrap';
import _ from 'lodash';
import { List } from 'immutable';
import CollectionStore from 'src/stores/alt/stores/CollectionStore';
import CollectionActions from 'src/stores/alt/actions/CollectionActions';
import CollectionTabLayoutEditor from 'src/apps/mydb/collections/CollectionTabLayoutEditor';
import UserStore from 'src/stores/alt/stores/UserStore';
import UserActions from 'src/stores/alt/actions/UserActions';
import UIStore from 'src/stores/alt/stores/UIStore';
import UIActions from 'src/stores/alt/actions/UIActions';
import { capitalizeWords } from 'src/utilities/textHelper';
import { filterTabLayout, getArrayFromLayout } from 'src/utilities/CollectionTabsHelper';
import { allElnElmentsWithLabel, allGenericElements } from 'src/apps/generic/Utils';
import { getAvailableTabs, getTabDisplayName } from 'src/utilities/ElementTabRegistry';

function TabItemComponent({ item }) {
  const displayName = getTabDisplayName(item);
  return <div>{displayName ?? capitalizeWords(item)}</div>;
}

export default class CollectionTabs extends React.Component {
  constructor(props) {
    super(props);

    this.state = {
      profileData: {},
      showModal: false,
      currentCollection: {},
      allElements: allElnElmentsWithLabel,
      layouts: allElnElmentsWithLabel.reduce((acc, { name }) => {
        acc[name] = { visible: List(), hidden: List() };
        return acc;
      }, {}),
      tree: {
        label: 'My Collections',
        id: -1,
        children: []
      },
      selectedCategory: allElnElmentsWithLabel[0]?.name || 'sample',
    };

    this.onStoreChange = this.onStoreChange.bind(this);
    this.onClickCollection = this.onClickCollection.bind(this);
    this.onUserStoreChange = this.onUserStoreChange.bind(this);

    this.handleChange = this.handleChange.bind(this);
    this.renderNode = this.renderNode.bind(this);
    this.handleSave = this.handleSave.bind(this);
  }

  getAllElements() {
    const genericEls = allGenericElements();
    const genericElsWithLabel = genericEls.map((el) => ({
      name: el.name,
      label: el.label,
      iconName: el.icon_name,
      isGeneric: true
    }));
    const combined = [...allElnElmentsWithLabel, ...genericElsWithLabel];
    return combined.sort((a, b) => a.label.localeCompare(b.label));
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
      return;
    }

    // Update allElements when genericEls changes
    const allElements = this.getAllElements();
    const { layouts: currentLayouts } = this.state;

    // Add new elements to layouts if they don't exist
    const updatedLayouts = allElements.reduce((acc, { name }) => {
      acc[name] = currentLayouts[name] || { visible: List(), hidden: List() };
      return acc;
    }, {});

    this.setState({
      profileData: data,
      allElements,
      layouts: updatedLayouts,
      selectedCategory: allElements[0]?.name || 'sample',
    });
  }

  onClickCollection(node) {
    const { profileData, allElements } = this.state;

    const layouts = allElements.reduce((acc, { name, isGeneric }) => {
      let layout;
      if (_.isEmpty(node.tabs_segment[name])) {
        layout = (profileData && profileData[`layout_detail_${name}`]) || {};
      } else {
        layout = node.tabs_segment[name];
      }

      // Get segment labels for this element type
      const segmentKlasses = (UserStore.getState() && UserStore.getState().segmentKlasses) || [];
      const segmentLabels = segmentKlasses
        .filter((s) => s.element_klass && s.element_klass.name === name)
        .map((s) => s.label);

      // Get all available tabs from the registry (for non-generic elements)
      const availableTabs = isGeneric
        ? null // Generic elements use dynamic tabs
        : getAvailableTabs(name, { segmentLabels });

      // Ensure default tabs exist in layout (for backward compatibility)
      if (!isGeneric && availableTabs) {
        const defaultTabs = ['properties', 'analyses'];
        const layoutKeys = Object.keys(layout);
        const maxOrder = Math.max(0, ...layoutKeys.map(k => Math.abs(layout[k])));

        defaultTabs.forEach((tab, idx) => {
          if (!layoutKeys.includes(tab) && availableTabs.includes(tab)) {
            layout[tab] = maxOrder + idx + 1;
          }
        });
      }

      const layoutData = getArrayFromLayout(layout, name, false, availableTabs);

      acc[name] = {
        visible: layoutData.visible,
        hidden: layoutData.hidden
      };
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
    const { currentCollection: cCol, layouts, allElements } = this.state;
    const layoutSegments = allElements.reduce((acc, { name }) => {
      const layout = filterTabLayout(layouts[name]);
      acc[name] = layout;
      return acc;
    }, {});
    CollectionActions.createTabsSegment({ layoutSegments, currentCollectionId: cCol.id });

    const { tree } = this.state;
    const newChildren = [...tree.children];

    const ancestryId = parseInt(cCol.ancestry, 10);
    if (cCol.ancestry && !Number.isNaN(ancestryId)) {
      const parentIndex = tree.children.findIndex((c) => c.id === ancestryId);
      const childIndex = parentIndex !== -1
        ? tree.children[parentIndex].children.findIndex((ch) => ch.id === cCol.id)
        : -1;
      if (childIndex !== -1) {
        newChildren[parentIndex] = {
          ...newChildren[parentIndex],
          children: newChildren[parentIndex].children.map((child, idx) => (
            idx === childIndex ? { ...child, tabs_segment: layoutSegments } : child
          ))
        };
      }
    } else {
      // Update root-level collection
      const collectionIndex = tree.children.findIndex((c) => c.id === cCol.id);
      if (collectionIndex !== -1) {
        newChildren[collectionIndex] = {
          ...newChildren[collectionIndex],
          tabs_segment: layoutSegments
        };
      }
    }

    // Update UIStore if this is the currently active collection
    const uiState = UIStore.getState();
    if (uiState.currentCollection && uiState.currentCollection.id === cCol.id) {
      const updatedCollection = {
        ...uiState.currentCollection,
        tabs_segment: layoutSegments,
        clearSearch: true
      };
      UIActions.selectCollection(updatedCollection);
    }

    this.setState({ showModal: false, tree: { ...tree, children: newChildren } });
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
    const { currentCollection, tree, showModal, layouts, selectedCategory, allElements } = this.state;

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
          contentClassName="vh-90"
        >
          <Modal.Header closeButton>
            <Modal.Title>{currentCollection.label}</Modal.Title>
          </Modal.Header>
          <Modal.Body className="p-0 h-100 overflow-hidden">
            <div className="d-flex h-100">
              {/* Left Sidebar */}
              <div className="bg-light border-end border-light p-3 w-40 overflow-auto">
                <div className="d-flex flex-column">
                  {allElements.map(({ name, label, iconName }) => {
                    const isActive = selectedCategory === name;
                    const btnClass = `btn text-start py-2 mb-2 ${isActive ? 'surface-active-on-white' : ''}`;
                    const icon = iconName || `icon-${name}`;
                    return (
                      <button
                        key={name}
                        type="button"
                        className={btnClass}
                        style={{
                          border: '1px solid var(--bs-border-color)',
                          borderRadius: '0.375rem',
                          backgroundColor: isActive ? undefined : 'white'
                        }}
                        onClick={() => this.setState({ selectedCategory: name })}
                      >
                        <i className={icon} />
                        {' '}
                        {label}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Right Content */}
              <div className="flex-grow-1 p-4" style={{ overflowY: 'auto' }}>
                <p className="text-muted mb-2">
                  Choose which items appear for this category and in what order.
                </p>
                <CollectionTabLayoutEditor
                  visible={layouts[selectedCategory].visible}
                  hidden={layouts[selectedCategory].hidden}
                  getItemComponent={({ item }) => <TabItemComponent item={item} tabTitlesMap={tabTitlesMap} />}
                  onLayoutChange={(visible, hidden) => {
                    this.setState((prevState) => ({
                      layouts: {
                        ...prevState.layouts,
                        [selectedCategory]: { visible, hidden }
                      }
                    }));
                  }}
                />
              </div>
            </div>
          </Modal.Body>
          <Modal.Footer className="d-flex justify-content-between">
            <Button variant="secondary" onClick={() => this.setState({ showModal: false })}>
              Cancel
            </Button>
            <Button variant="primary" onClick={this.handleSave}>
              Save changes
            </Button>
          </Modal.Footer>
        </Modal>
      </div>
    );
  }
}
