/* eslint-disable no-param-reassign */
/* eslint-disable react/require-default-props */
import React, {
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from 'react';
import PropTypes from 'prop-types';
import { CloseButton, Popover } from 'react-bootstrap';
import { List } from 'immutable';
import { isEmpty, set } from 'lodash';
import { reaction } from 'mobx';
import TabLayoutEditor from 'src/apps/mydb/elements/tabLayout/TabLayoutEditor';
import ConfigOverlayButton from 'src/components/common/ConfigOverlayButton';
import UIStore from 'src/stores/alt/stores/UIStore';
import { capitalizeWords } from 'src/utilities/textHelper';
import { filterTabLayout, getArrayFromLayout } from 'src/utilities/CollectionTabsHelper';
import { StoreContext } from 'src/stores/mobx/RootStore';

const isAllCollection = (collection) => Boolean(
  collection?.is_locked && collection?.label === 'All'
);

const ElementDetailSortTab = ({
  type,
  onTabPositionChanged,
  availableTabs,
  tabTitles,
  addInventoryTab,
  openedFromCollectionId,
}) => {
  const { collections } = useContext(StoreContext);
  const { userStore } = useContext(StoreContext);
  const [visible, setVisible] = useState(List());
  const [hidden, setHidden] = useState(List());
  const addInventoryTabRef = useRef(addInventoryTab);
  const availableTabsRef = useRef(availableTabs);
  const onTabPositionChangedRef = useRef(onTabPositionChanged);
  const openedFromCollectionIdRef = useRef(openedFromCollectionId);
  const availableTabsKey = availableTabs.join('|');

  useEffect(() => {
    addInventoryTabRef.current = addInventoryTab;
    availableTabsRef.current = availableTabs;
    onTabPositionChangedRef.current = onTabPositionChanged;
    openedFromCollectionIdRef.current = openedFromCollectionId;
  }, [addInventoryTab, availableTabs, onTabPositionChanged, openedFromCollectionId]);

  const getOpenedFromCollection = useCallback(() => {
    const currentOpenedFromCollectionId = openedFromCollectionIdRef.current;
    const stack = [
      collections.own_collection_tree,
      collections.shared_with_me_collection_tree,
    ];

    while (stack.length > 0) {
      const col = stack.pop();
      if (col.id === currentOpenedFromCollectionId) return col;
      if (col.children?.length > 0) stack.push(...col.children);
    }

    return null;
  }, [collections]);

  const updateTabLayout = useCallback((layout) => {
    const currentAvailableTabs = availableTabsRef.current;
    const currentAddInventoryTab = addInventoryTabRef.current;

    // Ensure default tabs exist in layout (for backward compatibility)
    if (layout && currentAvailableTabs) {
      const defaultTabs = ['properties', 'analyses'];
      const layoutKeys = Object.keys(layout);
      const maxOrder = Math.max(0, ...layoutKeys.map((key) => Math.abs(layout[key])));

      defaultTabs.forEach((tab, idx) => {
        if (!layoutKeys.includes(tab) && currentAvailableTabs.includes(tab)) {
          layout[tab] = maxOrder + idx + 1;
        }
      });
    }

    const nextLayout = getArrayFromLayout(
      layout,
      type,
      currentAddInventoryTab,
      currentAvailableTabs,
    );
    setVisible(nextLayout.visible);
    setHidden(nextLayout.hidden);
    onTabPositionChangedRef.current(nextLayout.visible);
  }, [type]);

  const refreshTabLayout = useCallback((profile) => {
    const collection = getOpenedFromCollection() || UIStore.getState().currentCollection;

    const rawTabs = collection?.tabs_segment;
    let collectionTabs = typeof rawTabs === 'string' ? JSON.parse(rawTabs) : rawTabs;
    if (isAllCollection(collection)) { collectionTabs = null; }

    const layout = (!collectionTabs || isEmpty(collectionTabs[`${type}`]))
      ? profile?.data?.[`layout_detail_${type}`]
      : collectionTabs[`${type}`];

    updateTabLayout(layout);
  }, [getOpenedFromCollection, type, updateTabLayout]);

  const updateLayout = useCallback(async () => {
    const layout = filterTabLayout({ visible, hidden });
    const { currentCollection } = UIStore.getState();

    const pending = [];
    if (!isAllCollection(currentCollection)) {
      const tabSegment = { ...currentCollection?.tabs_segment, [type]: layout };
      pending.push(collections.updateCollection(currentCollection, tabSegment));
    }

    const userProfile = userStore.profile;
    set(userProfile, `data.layout_detail_${type}`, layout);
    pending.push(userStore.updateUserProfile(userProfile));

    await Promise.all(pending);
    refreshTabLayout(userStore.profile);
  }, [collections, hidden, type, visible, userStore, refreshTabLayout]);

  const onLayoutChange = useCallback((nextVisible, nextHidden) => {
    setVisible(nextVisible);
    setHidden(nextHidden);
    onTabPositionChangedRef.current(nextVisible);
  }, []);

  const renderTabItem = useCallback(({ item }) => (
    <div>{tabTitles[item] ?? capitalizeWords(item)}</div>
  ), [tabTitles]);

  useEffect(() => {
    refreshTabLayout(userStore.profile);

    const disposeReaction = reaction(
      () => userStore.profile,
      (profile) => refreshTabLayout(profile),
    );

    return () => disposeReaction();
  }, [refreshTabLayout, userStore]);

  useEffect(() => {
    refreshTabLayout(userStore.profile);
  }, [addInventoryTab, availableTabsKey, refreshTabLayout, userStore.profile]);

  const { currentCollection } = UIStore.getState();
  const isOwnCollection = collections.isOwnCollection(currentCollection?.id);
  const allCollection = isAllCollection(currentCollection);
  if (!isOwnCollection && !allCollection) { return null; }

  const popoverSettings = ({ close }) => (
    <Popover>
      <Popover.Header className="d-flex justify-content-between align-items-center">
        Tab Layout
        <CloseButton onClick={close} />
      </Popover.Header>
      <Popover.Body>
        <TabLayoutEditor
          visible={visible}
          hidden={hidden}
          getItemComponent={renderTabItem}
          onLayoutChange={onLayoutChange}
        />
      </Popover.Body>
    </Popover>
  );

  return (
    <ConfigOverlayButton
      popoverSettings={popoverSettings}
      onClose={updateLayout}
    />
  );
};

ElementDetailSortTab.propTypes = {
  type: PropTypes.string.isRequired,
  onTabPositionChanged: PropTypes.func.isRequired,
  availableTabs: PropTypes.arrayOf(PropTypes.string).isRequired,
  tabTitles: PropTypes.objectOf(PropTypes.node),
  addInventoryTab: PropTypes.bool,
  openedFromCollectionId: PropTypes.number,
};

ElementDetailSortTab.defaultProps = {
  tabTitles: {},
  addInventoryTab: false,
};

export default ElementDetailSortTab;
