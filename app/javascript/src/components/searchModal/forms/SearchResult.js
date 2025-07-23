/* eslint-disable react/prop-types */
import React, { useContext, useState, useEffect } from 'react';
import {
  Tab, OverlayTrigger, Tooltip,
  ButtonToolbar, Button, Alert, Stack, ToggleButtonGroup, ToggleButton,
} from 'react-bootstrap';
import UIActions from 'src/stores/alt/actions/UIActions';
import ElementActions from 'src/stores/alt/actions/ElementActions';
import { elementShowOrNew } from 'src/utilities/routesUtils';

import { observer } from 'mobx-react';
import { StoreContext } from 'src/stores/mobx/RootStore';
import UserStore from 'src/stores/alt/stores/UserStore';
import UIStore from 'src/stores/alt/stores/UIStore';
import Aviator from 'aviator';
import SearchResultTabContent from 'src/components/searchModal/forms/SearchResultTabContent';

function SearchValuesList({ searchStore }) {
  const showResultErrorMessage = () => {
    if (searchStore.resultErrorMessage.length >= 1) {
      return (
        <Alert variant="danger" className="result-error-message">
          {searchStore.resultErrorMessage.join(', ')}
        </Alert>
      );
    }
    return null;
  };

  if (searchStore.searchResultVisible && searchStore.searchValues.length > 0) {
    return (
      <div className="search-value-list">
        <h4>Your Search</h4>
        {
            searchStore.searchValues.map((val, i) => <div key={i}>{val.replace('ILIKE', 'LIKE')}</div>)
          }
        {
            searchStore.searchResultsCount > 0 ? null : (
              <div className="search-spinner"><i className="fa fa-spinner fa-pulse fa-4x fa-fw" /></div>
            )
          }
        {showResultErrorMessage()}
      </div>
    );
  }
  return null;
}

function ResultsCount({ searchStore, results }) {
  if (searchStore.searchResultsCount === 0) { return null; }

  const counts = results.map((val) => {
    if (val.id === 'literatures') { return 0; }

    return val.results.total_elements;
  });
  const sum = counts.reduce((a, b) => a + b, 0);

  return (
    <div>
      <h4 className="search-result-number-of-results">
        {sum}
        {' '}
        results
      </h4>
    </div>
  );
}

function SearchResultTabContainer({
  searchStore, results, userState, visibleTabs, handleAdoptResult, handleChangeTab
}) {
  const genericElements = userState.genericEls || [];
  const activeTab = searchStore.search_result_active_tab_key;

  const searchResultNavItem = (list, tabResult) => {
    if (searchStore.searchResultsCount === 0) { return null; }

    const elnElements = ['cell_line', 'sample', 'reaction', 'screen', 'wellplate', 'research_plan'];
    let iconClass = `icon-${list.key}`;
    let tooltipText = list.key && (list.key.replace('_', ' ').replace(/(^\w|\s\w)/g, (m) => m.toUpperCase()));

    if (!elnElements.includes(list.key)) {
      const genericElement = (genericElements && genericElements.find((el) => el.name === list.key)) || {};
      iconClass = `${genericElement.icon_name} icon_generic_nav`;
      tooltipText = `${genericElement.label}<br />${genericElement.desc}`;
    }
    const tooltip = (
      <Tooltip id="_tooltip_history" className="left_tooltip">
        {tooltipText}
      </Tooltip>
    );
    const itemClass = tabResult.total_elements === 0 ? ' no-result' : '';

    return (
      <ToggleButton
        key={`result-${list.key}`}
        id={`result-${list.key}`}
        value={list.index}
        variant="outline-dark"
        className={itemClass}
      >
        <OverlayTrigger delayShow={500} placement="top" overlay={tooltip}>
          <div className="d-inline-flex align-items-center">
            <i className={`${iconClass} pe-1`} />
            <span className="fs-3">
              (
              {tabResult.total_elements}
              )
            </span>
          </div>
        </OverlayTrigger>
      </ToggleButton>
    );
  };

  const adoptResultAndOpenDetail = (element) => {
    const { currentCollection, isSync } = UIStore.getState();
    const { id, type } = element;
    const uri = isSync
      ? `/scollection/${currentCollection.id}/${type}/${id}`
      : `/collection/${currentCollection.id}/${type}/${id}`;
    Aviator.navigate(uri, { silent: true });

    const e = { type, params: { collectionID: currentCollection.id } };
    e.params[`${type}ID`] = id;

    const genericEls = (UserStore.getState() && UserStore.getState().genericEls) || [];
    if (genericEls.find((el) => el.name === type)) {
      e.klassType = 'GenericEl';
    }

    elementShowOrNew(e);
    handleAdoptResult();

    return null;
  };

  if (searchStore.searchResultsCount === 0) { return null; }

  const navItems = [];
  const tabContents = [];

  visibleTabs.forEach((list) => {
    const tab = results.find((val) => val.id.indexOf(list.key) !== -1);
    if (tab === undefined) { return; }
    const tabResult = tab.results;

    const navItem = searchResultNavItem(list, tabResult);
    const tabContent = (
      <SearchResultTabContent
        key={`${list.key}-result-tab`}
        list={list}
        tabResult={tabResult}
        openDetail={adoptResultAndOpenDetail}
      />
    );

    navItems.push(navItem);
    tabContents.push(tabContent);
  });

  return (
    <Tab.Container
      id="tabList"
      defaultActiveKey={1}
      activeKey={activeTab}
    >
      <div className="search-result-tabs">
        <Stack direction="horizontal" className="advanced-search-content-header">
          <ToggleButtonGroup
            type="radio"
            name="options"
            key="result-element-options"
            value={searchStore.search_result_active_tab_key}
            onChange={handleChangeTab}
            className="advanced-search-result-toggle-elements"
          >
            {navItems}
          </ToggleButtonGroup>
        </Stack>
        <Tab.Content className="search-result-tab-content">
          {tabContents}
        </Tab.Content>
      </div>
    </Tab.Container>
  );
}

function ResultButtons({ searchStore, handleClear, handleAdoptResult }) {
  if (searchStore.searchResultsCount === 0) { return null; }

  return (
    <ButtonToolbar className="advanced-search-buttons results">
      <Button variant="warning" onClick={() => searchStore.handleCancel()}>
        Cancel
      </Button>
      <Button variant="info" onClick={handleClear}>
        Reset
      </Button>
      <Button variant="primary" onClick={handleAdoptResult}>
        Adopt Result
      </Button>
    </ButtonToolbar>
  );
}

function SearchResult({ handleClear }) {
  const searchStore = useContext(StoreContext).search;
  const results = searchStore.searchResultValues;
  const userState = UserStore.getState();
  const profile = userState.profile || {};
  const [visibleTabs, setVisibleTabs] = useState([]);

  const handleChangeTab = (key) => {
    searchStore.changeSearchResultActiveTabKey(key);
  };

  useEffect(() => {
    if (typeof (profile) !== 'undefined' && profile
      && typeof (profile.data) !== 'undefined' && profile.data) {
      const visible = [];

      Object.entries(profile.data.layout).filter((value) => value[1] > 0)
        .sort((a, b) => a[1] - b[1])
        .forEach((value, i) => {
          const tab = results.find((val) => val.id.indexOf(value[0]) !== -1);
          const totalElements = tab === undefined ? 0 : tab.results.total_elements;
          if (value[1] > 0 && tab !== undefined) {
            visible.push({ key: value[0], index: i, totalElements });
          }
        });
      setVisibleTabs(visible);
      let activeTabElement = visible.find((v) => v.totalElements !== 0);
      activeTabElement = activeTabElement !== undefined ? activeTabElement.index : 1;
      handleChangeTab(activeTabElement);
    }
  }, [results]);

  const prepareResultForDispatch = () => {
    const resultObject = {};
    results.forEach((val) => {
      const firstElements = searchStore.tabSearchResultValues.find((tab) => tab.id === `${val.id}-1`);
      resultObject[val.id] = {
        elements: firstElements.results.elements,
        ids: val.results.ids,
        page: val.results.page,
        pages: val.results.pages,
        perPage: val.results.per_page,
        totalElements: val.results.total_elements
      };
    });
    return resultObject;
  };

  const handleAdoptResult = () => {
    const preparedResult = prepareResultForDispatch();
    UIActions.setSearchById(preparedResult);
    ElementActions.changeSorting(true);
    ElementActions.dispatchSearchResult(preparedResult);
    searchStore.handleAdopt();
  };

  return (
    <>
      <div className="result-content-header">
        <SearchValuesList searchStore={searchStore} />
        <ResultsCount searchStore={searchStore} results={results} />
      </div>
      <SearchResultTabContainer
        searchStore={searchStore}
        results={results}
        userState={userState}
        visibleTabs={visibleTabs}
        handleAdoptResult={handleAdoptResult}
        handleChangeTab={handleChangeTab}
      />
      <ResultButtons searchStore={searchStore} handleClear={handleClear} handleAdoptResult={handleAdoptResult} />
    </>
  );
}

export default observer(SearchResult);
