import React, { useState, useEffect, useContext, useMemo } from 'react';
import PropTypes from 'prop-types';
import { set, isEmpty } from 'lodash';
import { List } from 'immutable';
import AppModal from 'src/components/common/AppModal';
import CollectionTabLayoutEditor from 'src/apps/mydb/collections/CollectionTabLayoutEditor';
import UserStore from 'src/stores/alt/stores/UserStore';
import UserActions from 'src/stores/alt/actions/UserActions';
import { capitalizeWords } from 'src/utilities/textHelper';
import { filterTabLayout, getArrayFromLayout, TAB_DISPLAY_NAMES } from 'src/utilities/CollectionTabsHelper';
import { allElnElmentsWithLabel, allGenericElements } from 'src/apps/generic/Utils';
import { observer } from 'mobx-react';
import { StoreContext } from 'src/stores/mobx/RootStore';
import ElementIcon from 'src/components/common/ElementIcon';

function TabItemComponent({ item }) {
  const displayName = TAB_DISPLAY_NAMES[item];
  return <div>{displayName ?? capitalizeWords(item)}</div>;
}

TabItemComponent.propTypes = {
  item: PropTypes.string.isRequired,
};

// Unlike the former CollectionTabs view (full A–Z sort of ELN + generics), keep the
// familiar ELN order (Sample, Reaction, …) and only sort generic element types by label.
function buildElementList() {
  const standardEls = allElnElmentsWithLabel.map((el) => ({
    ...el,
    type: el.name,
  }));

  const genericEls = allGenericElements();
  if (genericEls.size < 1) {
    return standardEls;
  }

  const genericElsWithLabel = genericEls.map((el) => ({
    name: el.name,
    label: el.label,
    icon_name: el.icon_name,
    type: el.name,
    isGeneric: true,
  }));
  return [
    ...standardEls,
    ...[...genericElsWithLabel].sort((a, b) => a.label.localeCompare(b.label)),
  ];
}

function emptyLayoutsFor(elements) {
  return elements.reduce((acc, { name }) => {
    acc[name] = { visible: List(), hidden: List() };
    return acc;
  }, {});
}

function layoutsForCollection(collection, allElements, profileData) {
  const tabsSegment = typeof collection.tabs_segment === 'string'
    ? JSON.parse(collection.tabs_segment)
    : (collection.tabs_segment || {});

  return allElements.reduce((acc, { name, isGeneric }) => {
    const layoutDetail = isGeneric ? 'layout_detail_generic' : `layout_detail_${name}`;
    const defaultLayout = (profileData && profileData[layoutDetail]) || {};
    const layout = isEmpty(tabsSegment[name]) ? defaultLayout : tabsSegment[name];

    const segmentKlasses = (UserStore.getState() && UserStore.getState().segmentKlasses) || [];
    const segmentLabels = segmentKlasses
      .filter((s) => s.element_klass && s.element_klass.name === name)
      .map((s) => s.label);

    const tabsFromProfile = Object.keys(defaultLayout);
    const availableTabs = [...new Set([...tabsFromProfile, ...segmentLabels])];

    acc[name] = getArrayFromLayout(layout, name, false, availableTabs);
    return acc;
  }, {});
}

const CollectionTabsEditorModal = ({ collection, show, onHide }) => {
  const collectionsStore = useContext(StoreContext).collections;
  const allElements = useMemo(() => buildElementList(), []);
  const [layouts, setLayouts] = useState(() => emptyLayoutsFor(allElements));
  const [selectedCategory, setSelectedCategory] = useState('sample');

  useEffect(() => {
    if (!show || !collection) return;
    const { profile } = UserStore.getState();
    const profileData = (profile && profile.data) || {};
    setLayouts(layoutsForCollection(collection, allElements, profileData));
    setSelectedCategory('sample');
  }, [show, collection, allElements]);

  const handleSave = () => {
    const layoutSegments = allElements.reduce((acc, { name }) => {
      acc[name] = filterTabLayout(layouts[name]);
      return acc;
    }, {});
    collectionsStore.updateCollection(collection, layoutSegments);

    const userProfile = UserStore.getState().profile;
    // Known limitation: every generic element type writes to the same
    // `layout_detail_generic` profile key, so the last iteration wins as the
    // per-user default. Per-collection storage via `tabs_segment[name]` is
    // unaffected. Fixing needs a schema change to key generics by name.
    allElements.forEach(({ name, isGeneric }) => {
      const profileKey = isGeneric ? 'layout_detail_generic' : `layout_detail_${name}`;
      set(userProfile, `data.${profileKey}`, layoutSegments[name]);
    });
    UserActions.updateUserProfile(userProfile);

    onHide();
  };

  if (!show || !collection) return null;

  return (
    <AppModal
      size="lg"
      show={show}
      onHide={onHide}
      contentClassName="vh-90"
      bodyClassName="p-0 h-100 overflow-hidden"
      title={collection.label}
      primaryActionLabel="Save changes"
      onPrimaryAction={handleSave}
    >
      <div className="d-flex h-100">
        <div className="bg-light border-end border-light p-3 w-40 overflow-auto">
          <div className="d-flex flex-column">
            {allElements.map((element) => {
              const { name, label } = element;
              const isActive = selectedCategory === name;
              const btnClass = `btn text-start py-2 mb-2 ${isActive ? 'surface-active' : ''}`;
              return (
                <button
                  key={name}
                  type="button"
                  className={btnClass}
                  style={{
                    border: '1px solid var(--bs-border-color)',
                    borderRadius: '0.375rem',
                    backgroundColor: isActive ? undefined : 'white',
                  }}
                  onClick={() => setSelectedCategory(name)}
                >
                  <ElementIcon element={element} className="me-1" />
                  {label}
                </button>
              );
            })}
          </div>
        </div>

        <div className="flex-grow-1 p-4" style={{ overflowY: 'auto' }}>
          <p className="text-muted mb-2">
            Choose which items appear for this category and in what order.
          </p>
          {layouts[selectedCategory] && (
            <CollectionTabLayoutEditor
              visible={layouts[selectedCategory].visible}
              hidden={layouts[selectedCategory].hidden}
              getItemComponent={({ item }) => <TabItemComponent item={item} />}
              onLayoutChange={(visible, hidden) => {
                setLayouts({ ...layouts, [selectedCategory]: { visible, hidden } });
              }}
            />
          )}
        </div>
      </div>
    </AppModal>
  );
};

CollectionTabsEditorModal.propTypes = {
  collection: PropTypes.shape({
    id: PropTypes.oneOfType([PropTypes.number, PropTypes.string]).isRequired,
    label: PropTypes.string.isRequired,
    tabs_segment: PropTypes.oneOfType([PropTypes.object, PropTypes.string]),
  }),
  show: PropTypes.bool.isRequired,
  onHide: PropTypes.func.isRequired,
};

CollectionTabsEditorModal.defaultProps = {
  collection: null,
};

export default observer(CollectionTabsEditorModal);
