import React, { useState, useEffect, useContext } from 'react';
import Tree from 'react-ui-tree';
import { Button, Modal } from 'react-bootstrap';
import { set, isEmpty } from 'lodash';
import { List } from 'immutable';
import CollectionTabLayoutEditor from 'src/apps/mydb/collections/CollectionTabLayoutEditor';
import UserStore from 'src/stores/alt/stores/UserStore';
import UserActions from 'src/stores/alt/actions/UserActions';
import { capitalizeWords } from 'src/utilities/textHelper';
import { filterTabLayout, getArrayFromLayout, TAB_DISPLAY_NAMES } from 'src/utilities/CollectionTabsHelper';
import { allElnElmentsWithLabel, allGenericElements } from 'src/apps/generic/Utils';
import { observer } from 'mobx-react';
import { StoreContext } from 'src/stores/mobx/RootStore';

function TabItemComponent({ item }) {
  const displayName = TAB_DISPLAY_NAMES[item];
  return <div>{displayName ?? capitalizeWords(item)}</div>;
}

const CollectionTabs = () => {
  const collectionsStore = useContext(StoreContext).collections;
  const [showModal, setShowModal] = useState(false);
  const [profileData, setProfileData] = useState({});
  const [currentCollection, setCurrentCollection] = useState({});
  const [allElements, setAllElements] = useState(allElnElmentsWithLabel)
  const [layouts, setLayouts] = useState(allElements.reduce((acc, { name }) => {
    acc[name] = { visible: List(), hidden: List() };
    return acc;
  }, {}));
  const [selectedCategory, setSelectedCategory] = useState(allElements[0]?.name || 'sample');
  const tree = collectionsStore.own_collection_tree;

  useEffect(() => {
    const { profile } = UserStore.getState();
    if (profile && profile.data) {
      setProfileData(profile.data)
    }
    getAllElements();
  }, []);

  const getAllElements = () => {
    const genericEls = allGenericElements();
    if (genericEls.size < 1) { return }

    const genericElsWithLabel = genericEls.map((el) => ({
      name: el.name,
      label: el.label,
      iconName: el.icon_name,
      isGeneric: true
    }));
    const combined = [...allElnElmentsWithLabel, ...genericElsWithLabel];
    combined.sort((a, b) => a.label.localeCompare(b.label));

    setAllElements(combined);
    setSelectedCategory(combined[0]?.name);
    setLayouts(combined.reduce((acc, { name }) => {
      acc[name] = { visible: List(), hidden: List() };
      return acc;
    }, {}));
  }

  const handleChange = (tree) => {
    collectionsStore.setOwnCollectionTree(tree);
  }

  const handleSave = () => {
    const layoutSegments = allElnElmentsWithLabel.reduce((acc, { name }) => {
      const layout = filterTabLayout(layouts[name]);
      acc[name] = layout;
      return acc;
    }, {});
    collectionsStore.updateCollection(currentCollection, layoutSegments);

    // Update profile
    const userProfile = UserStore.getState().profile;
    Object.entries(layoutSegments).map((type, layout) => {
      set(userProfile, `data.layout_detail_${type}`, layout);
    });
    UserActions.updateUserProfile(userProfile);

    setShowModal(false);
  }

  const onClickCollection = (node) => {
    const tabsSegment = typeof (node.tabs_segment) == 'string' ? JSON.parse(node.tabs_segment) : node.tabs_segment;
    const layouts = allElements.reduce((acc, { name, isGeneric }) => {
      let layout;
      // Use element-specific layout, or generic layout for generic elements, or empty
      const layoutDetail = isGeneric ? 'layout_detail_generic' : `layout_detail_${name}`;
      const defaultLayout = (profileData && profileData[layoutDetail]) || {};
      layout = (isEmpty(tabsSegment[name])) ? defaultLayout : tabsSegment[name];

      // Get segment labels for this element type
      const segmentKlasses = (UserStore.getState() && UserStore.getState().segmentKlasses) || [];
      const segmentLabels = segmentKlasses
        .filter((s) => s.element_klass && s.element_klass.name === name)
        .map((s) => s.label);

      // Get all available tabs from profile data
      const tabsFromProfile = Object.keys(defaultLayout);
      const availableTabs = [...new Set([...tabsFromProfile, ...segmentLabels])];

      acc[name] = getArrayFromLayout(layout, name, false, availableTabs);
      return acc;
    }, {});

    setCurrentCollection(node);
    setShowModal(true);
    setLayouts(layouts);
  }
  
  const renderNode = (node) => {
    if (node.is_locked || node.id < 1) {
      return (
        <div className="ms-3 mb-2 fs-5">{node.label}</div>
      );
    }

    return (
      <div
        className="d-flex align-items-center justify-content-between mb-2 bg-dark-subtle"
        draggable={false}
        onMouseDown={(e) => e.stopPropagation()}
      >
        <div className="ms-3">{node.label}</div>
        <Button
          size="sm"
          variant="primary"
          onClick={() => onClickCollection(node)}
          title="Click to edit collection tab sorting"
        >
          <i className="fa fa-pencil" />
        </Button>
      </div>
    );
  }

  return (
    <div className="tree mt-2">
      <Tree
        paddingLeft={30}
        tree={tree}
        onChange={handleChange}
        renderNode={renderNode}
      />

      {
        showModal && (
          <Modal
            size="lg"
            centered
            animation
            show={showModal}
            onHide={() => setShowModal(false)}
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
                          onClick={() => setSelectedCategory(name)}
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
                    getItemComponent={({ item }) => <TabItemComponent item={item} />}
                    onLayoutChange={(visible, hidden) => {
                      setLayouts({ ...layouts, [selectedCategory]: { visible, hidden } });
                    }}
                  />
                </div>
              </div>
            </Modal.Body>
            <Modal.Footer className="d-flex justify-content-between">
              <Button variant="secondary" onClick={() => setShowModal(false)}>
                Cancel
              </Button>
              <Button variant="primary" onClick={() => handleSave()}>
                Save changes
              </Button>
            </Modal.Footer>
          </Modal>
        )
      }
    </div>
  );
}

export default observer(CollectionTabs);
