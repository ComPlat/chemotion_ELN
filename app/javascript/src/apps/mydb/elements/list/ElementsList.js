import { List, Set } from 'immutable';
import UserInfosTooltip from 'src/apps/mydb/collections/UserInfosTooltip';
import SharedToMeInfosTooltip from 'src/apps/mydb/collections/SharedToMeInfosTooltip';
import React, {
  useCallback, useContext, useEffect, useRef, useState,
} from 'react';
import {
  Tabs, Tab, Tooltip, OverlayTrigger, Button
} from 'react-bootstrap';
import PropTypes from 'prop-types';
import { observer } from 'mobx-react';
import UIActions from 'src/stores/alt/actions/UIActions';
import Search from 'src/apps/mydb/elements/list/search/Search';
import ElementActions from 'src/stores/alt/actions/ElementActions';
import SelectionActions from 'src/apps/mydb/elements/list/selectionActions/SelectionActions';
import MatrixCheck from 'src/components/common/MatrixCheck';
import CreateElementButton from 'src/components/navigation/CreateElementButton';
import ElementsTable from 'src/apps/mydb/elements/list/ElementsTable';
import ElementsTableSettings from 'src/apps/mydb/elements/list/ElementsTableSettings';
import ElementStore from 'src/stores/alt/stores/ElementStore';
import UIStore from 'src/stores/alt/stores/UIStore';
import { StoreContext } from 'src/stores/mobx/RootStore';
import { allElnElements } from 'src/apps/generic/Utils';
import { capitalizeWords } from 'src/utilities/textHelper';

function getVisibleAndHiddenFromLayout(layout) {
  const visible = [];
  const hidden = [];
  Object.keys(layout).forEach((key) => {
    if (layout[key] < 0) {
      hidden.push(key);
    } else {
      visible.push(key);
    }
  });

  return {
    visible: List(visible).sortBy((t) => layout[t]),
    hidden: List(hidden).sortBy((t) => -1 * layout[t]),
  };
}

function computeTotalElements(state) {
  const totalElements = {};
  Object.keys(state.elements).forEach((key) => {
    totalElements[key] = state.elements[key]?.totalElements;
  });
  return totalElements;
}

function computeTotalCheckedElements(state, currentUser) {
  let genericKlasses = [];
  if (MatrixCheck(currentUser.matrix, 'genericElement')) {
    const { klasses } = UIStore.getState();
    genericKlasses = klasses;
  }

  const elNames = allElnElements.concat(genericKlasses);

  const totalCheckedElements = {};
  elNames.forEach((type) => {
    const elementUI = state[type] || {
      checkedAll: false,
      checkedIds: List(),
      uncheckedIds: List(),
    };
    const element = ElementStore.getState().elements[`${type}s`];
    totalCheckedElements[type] = elementUI.checkedAll
      ? (element.totalElements - elementUI.uncheckedIds.size)
      : elementUI.checkedIds.size;
  });
  return totalCheckedElements;
}

const ElementsList = ({ overview }) => {
  const { search, userStore, collections } = useContext(StoreContext);
  const [totalElements, setTotalElements] = useState(
    () => computeTotalElements(ElementStore.getState())
  );
  const [totalCheckedElements, setTotalCheckedElements] = useState(
    () => computeTotalCheckedElements(UIStore.getState(), userStore.currentUser || {})
  );
  const [currentCollection, setCurrentCollection] = useState(
    () => UIStore.getState().currentCollection
  );

  const onChangeElement = useCallback((state) => {
    setTotalElements((prevTotalElements) => (
      { ...prevTotalElements, ...computeTotalElements(state) }
    ));
  }, []);

  // The header's share icon shows UserInfosTooltip/SharedToMeInfosTooltip on hover, which
  // otherwise fetch their share list lazily on first mount and resize once it arrives. That
  // resize can shift the icon out from under the pointer, triggering a hide/show/hide flicker
  // (mouseleave -> hide -> layout settles back -> mouseenter -> show -> resize -> repeat).
  // Fetching as soon as the collection is known to be shared means the tooltip's first render
  // already has the real content, so it never resizes while visible.
  const prefetchShareInfo = useCallback((collection) => {
    if (!collections || collection?.id == null) return;

    if (collection.shared) {
      if (collections.sharedWithUsers(collection.id) === undefined) {
        collections.getSharedWithUsers(collection.id);
      }
    } else if (collections.isSharedCollection?.(collection.id)) {
      if (collections.mySharesFor(collection.id) === undefined) {
        collections.getMySharesFor(collection.id);
      }
    }
  }, [collections]);

  // onChangeUI is memoized with [userStore], so reading the currentCollection
  // state variable in it would close over whatever render it was last built
  // in (stale closure) - same reason setCurrentCollection above uses the
  // functional updater instead of comparing against that state variable
  // directly. A ref sidesteps that: ref.current is always up to date
  // regardless of when this callback was created.
  const lastPrefetchedCollectionId = useRef(currentCollection?.id ?? null);

  const onChangeUI = useCallback((state) => {
    const newTotalCheckedElements = computeTotalCheckedElements(state, userStore.currentUser || {});

    setTotalCheckedElements((prevTotalCheckedElements) => {
      const needsUpdate = Object.keys(newTotalCheckedElements).some(
        (type) => newTotalCheckedElements[type] !== prevTotalCheckedElements[type]
      );
      return needsUpdate ? newTotalCheckedElements : prevTotalCheckedElements;
    });
    setCurrentCollection((prevCurrentCollection) => (
      prevCurrentCollection !== state.currentCollection ? state.currentCollection : prevCurrentCollection
    ));

    const newCollectionId = state.currentCollection?.id ?? null;
    if (lastPrefetchedCollectionId.current !== newCollectionId) {
      lastPrefetchedCollectionId.current = newCollectionId;
      prefetchShareInfo(state.currentCollection);
    }
  }, [userStore, prefetchShareInfo]);

  useEffect(() => {
    ElementStore.listen(onChangeElement);
    return () => ElementStore.unlisten(onChangeElement);
  }, [onChangeElement]);

  useEffect(() => {
    UIStore.listen(onChangeUI);
    return () => UIStore.unlisten(onChangeUI);
  }, [onChangeUI]);

  // onChangeUI only prefetches on a *change* of currentCollection, so the one
  // that's already current at mount (currentCollection's own useState
  // initializer read it straight from UIStore) needs its own one-off fetch.
  useEffect(() => {
    prefetchShareInfo(currentCollection);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  let visible = List();
  let hidden = List();
  let { currentTab, currentType } = userStore;

  if (userStore.profile?.data?.layout) {
    const profileConfig = getVisibleAndHiddenFromLayout(userStore.profile.data.layout);
    ({ visible, hidden } = profileConfig);

    currentTab = visible.findIndex((e) => e === currentType);
    if (currentType === '') { currentType = visible.get(0); }
  }

  if (currentTab < 0) currentTab = 0;

  const genericEls = userStore.genericEls || [];

  const handleRemoveSearchResult = () => {
    search.changeShowSearchResultListValue(false);
    UIActions.clearSearchById();
    ElementActions.changeSorting(false);
    const { currentCollection: uiCurrentCollection } = UIStore.getState();
    UIActions.selectCollection(uiCurrentCollection);
  };

  const handleTabSelect = (tab) => {
    const type = visible.get(tab);
    userStore.selectTab(tab, type);

    // TODO sollte in tab action handler
    const uiState = UIStore.getState();

    if (!uiState[type] || !uiState[type].page) { return; }

    const { page } = uiState[type];

    UIActions.setPagination({ type, page });
  };

  const hasSearchApplied = !!UIStore.getState().currentSearchByID;

  const constEls = Set(allElnElements);
  const tabItems = visible.map((value, i) => {
    let iconClass = `icon-${value}`;
    let ttl = (
      <Tooltip>
        {value && (capitalizeWords(value))}
      </Tooltip>
    );

    let genericEl = null;
    if (!constEls.has(value)) {
      genericEl = (genericEls && genericEls.find((el) => el.name === value)) || {};
      iconClass = `${genericEl.icon_name} icon_generic_nav`;
      ttl = (
        <Tooltip>
          {genericEl.label}
          <br />
          {genericEl.desc}
        </Tooltip>
      );
    }

    const title = (
      <OverlayTrigger
        overlay={ttl}
        placement="top"
      >
        <span>
          <i className={`me-1 ${iconClass}`} />
          {`${totalElements[`${value}s`] || 0} (${totalCheckedElements[value] || 0})`}
        </span>
      </OverlayTrigger>
    );

    return (
      <Tab
        key={value}
        eventKey={i}
        title={title}
        className={`elements-list-tab-${value}s`}
      >
        <ElementsTable
          type={value}
          genericEl={genericEl}
        />
      </Tab>
    );
  });

  return (
    <div className="elements-list h-100 d-flex flex-column" style={{ minWidth: '400px' }}>
      <div className="d-flex align-items-center justify-content-between mb-3 flex-wrap column-gap-4 row-gap-2 min-w-0">
        <h1 className="m-0 text-capitalize d-flex align-items-center gap-2 min-w-0">
          <span className="text-truncate flex-grow-1 min-w-0">{currentCollection?.label || ''}</span>
          {/* Own vs shared-with-me are mutually exclusive: if the current user owns
              the collection (`shared` is set when they've shared it with others), don't
              also render the shared-with-me indicator even if the store reports it. */}
          {currentCollection?.shared ? (
            <OverlayTrigger placement="auto" overlay={<UserInfosTooltip collectionId={currentCollection.id} />}>
              <i className="fa fa-share-alt fs-5" aria-label="Shared collection" />
            </OverlayTrigger>
          ) : (currentCollection?.id != null
            && collections?.isSharedCollection?.(currentCollection.id) && (
            <OverlayTrigger
              placement="auto"
              overlay={(
                <SharedToMeInfosTooltip
                  collectionId={currentCollection.id}
                  owner={currentCollection.owner}
                />
              )}
            >
              <i className="fa fa-share-alt fs-5" aria-label="Shared to me collection" />
            </OverlayTrigger>
          ))}
          {hasSearchApplied && (<span className="ms-2 text-lighten2 condensed-text-width">(search results)</span>)}
        </h1>
        <div className="d-flex align-items-center gap-3">
          {hasSearchApplied ? (
            <Button
              variant="light"
              onClick={() => handleRemoveSearchResult()}
            >
              <i className="fa fa-times-circle me-2" />
              Clear search
            </Button>
          ) : <Search />}
          {overview && <CreateElementButton />}
        </div>
      </div>
      <SelectionActions />
      <div className="tabs-container--with-full-grow position-relative">
        <ElementsTableSettings
          visible={visible}
          hidden={hidden}
        />
        <Tabs
          id="tabList"
          activeKey={currentTab}
          onSelect={(eventKey) => handleTabSelect(parseInt(eventKey, 10))}
          className="surface-tabs has-config-overlay"
        >
          {tabItems}
        </Tabs>
      </div>
    </div>
  );
};

ElementsList.propTypes = {
  overview: PropTypes.bool,
};

ElementsList.defaultProps = {
  overview: true,
};

export default observer(ElementsList);
