/* eslint-disable react/prop-types */
import React, { useContext, useState, useEffect } from 'react';
import {
  Tab, OverlayTrigger, Tooltip,
  ButtonToolbar, Button, Alert, Stack, ToggleButtonGroup, ToggleButton,
} from 'react-bootstrap';
import UIActions from 'src/stores/alt/actions/UIActions';
import ElementActions from 'src/stores/alt/actions/ElementActions';
import { elementShowOrNew } from 'src/utilities/routesUtils';
import { capitalizeWords } from 'src/utilities/textHelper';

import { observer } from 'mobx-react';
import { StoreContext } from 'src/stores/mobx/RootStore';
import UserStore from 'src/stores/alt/stores/UserStore';
import UIStore from 'src/stores/alt/stores/UIStore';
import Aviator from 'aviator';
import SearchResultTabContent from 'src/components/searchModal/forms/SearchResultTabContent';

function SearchResult({ handleClear }) {
  const searchStore = useContext(StoreContext).search;
  const results = searchStore.searchResultValues;
  const userState = UserStore.getState();
  const profile = userState.profile || {};
  const genericElements = userState.genericEls || [];
  const [visibleTabs, setVisibleTabs] = useState([]);

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

  const handleChangeTab = (key) => {
    searchStore.changeSearchResultActiveTabKey(key);
  };

  const handleAdoptResult = () => {
    const preparedResult = prepareResultForDispatch();
    UIActions.setSearchById(preparedResult);
    ElementActions.changeSorting(true);
    ElementActions.dispatchSearchResult(preparedResult);
    searchStore.handleAdopt();
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

    if (genericElements.find((el) => el.name === type)) {
      e.klassType = 'GenericEl';
    }

    elementShowOrNew(e);
    handleAdoptResult();

    return null;
  };

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

  const searchValuesList = () => {
    if (searchStore.searchResultVisible && searchStore.searchValues.length > 0) {
      return (
        <div className="search-value-list">
          <h4>Your Search</h4>
          {
            searchStore.searchValues.map((val, i) => {
              let cleanVal = val.replace(/\bILIKE\b/, 'LIKE');

              if (i === 0) {
                cleanVal = cleanVal
                  .replace(/^AND\b\s*/, '')
                  .replace(/^OR\b\s*/, '')
                  .trim();
              }

              return <div key={i}>{cleanVal}</div>;
            })
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

  const resultsCount = () => {
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

  const searchResultNavItem = (list, tabResult) => {
    if (searchStore.searchResultsCount === 0) { return null }

    const elnElements = ['cell_line', 'sample', 'reaction', 'screen', 'wellplate', 'research_plan'];
    let iconClass = `icon-${list.key}`;
    let tooltipText = list.key && capitalizeWords(list.key);

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
    let itemClass = tabResult.total_elements === 0 ? 'no-result' : '';
    itemClass = searchStore.search_result_active_tab_key == list.index ? itemClass + ' active' : itemClass;

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
              ({tabResult.total_elements})
            </span>
          </div>
        </OverlayTrigger>
      </ToggleButton>
    );
  }

  const searchResultTabContainer = () => {
    if (searchStore.searchResultsCount === 0) { return null }

    const navItems = [];
    const tabContents = [];

    visibleTabs.map((list) => {
      const tab = results.find(val => val.id.indexOf(list.key) !== -1);
      if (tab === undefined) { return; }
      const tabResult = tab.results;

      const navItem = searchResultNavItem(list, tabResult);
      const tabContent =
        <SearchResultTabContent
          key={`${list.key}-result-tab`}
          list={list}
          tabResult={tabResult}
          openDetail={adoptResultAndOpenDetail}
        />

      navItems.push(navItem);
      tabContents.push(tabContent);
    });

    return (
      <Tab.Container
        id="tabList"
        defaultActiveKey={1}
        activeKey={searchStore.search_result_active_tab_key}
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

  const resultButtons = () => {
    if (searchStore.searchResultsCount === 0) { return null; }

    return (
      <ButtonToolbar className="advanced-search-buttons results">
        <Button variant="primary" onClick={() => searchStore.handleCancel()}>
          Cancel
        </Button>
        <Button variant="info" onClick={handleClear}>
          Reset
        </Button>
        <Button variant="warning" onClick={handleAdoptResult}>
          Adopt Result
        </Button>
      </ButtonToolbar>
    );
  }

  return (
    <>
      <div className="result-content-header">
        {searchValuesList()}
        {resultsCount()}
      </div>
      {searchResultTabContainer()}
      {resultButtons()}
    </>
  );
}

export default observer(SearchResult);
