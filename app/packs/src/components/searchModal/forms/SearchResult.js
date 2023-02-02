import React, { useContext, useState, useEffect } from 'react';
import { Col, Navbar, Nav, NavItem, Row, Tab, OverlayTrigger, Tooltip, ButtonToolbar, Button } from 'react-bootstrap';
import UIActions from 'src/stores/alt/actions/UIActions';
import ElementActions from 'src/stores/alt/actions/ElementActions';
import { observer } from 'mobx-react';
import { StoreContext } from 'src/stores/mobx/RootStore';
import UserStore from 'src/stores/alt/stores/UserStore';
import SearchResultTabContent from './SearchResultTabContent';

const SearchResult = ({ handleCancel, searchParams, handleRefind }) => {
  const searchResultsStore = useContext(StoreContext).searchResults;
  const results = searchResultsStore.searchResultValues;
  const userState = UserStore.getState();
  const profile = userState.profile || {};
  const genericElements = userState.genericEls || [];
  const [visibleTabs, setVisibleTabs] = useState([]);
  const [currentTabIndex, setCurrentTabIndex] = useState(0);

  useEffect(() => {
    if (typeof (profile) !== 'undefined' && profile &&
      typeof (profile.data) !== 'undefined' && profile.data)  {
      const visible = [];

      Object.entries(profile.data.layout).filter((value) => {
        return value[0] != 'research_plan';
      }).map((value, i) => {
        let tab = results.find(val => val.id.indexOf(value[0]) !== -1);
        let totalElements = tab === undefined ? 0 : tab.results.total_elements;
        if (value[1] > 0) {
          visible.push({ key: value[0], index: i, totalElements: totalElements });
        }
      });
      setVisibleTabs(visible.sort((a,b) => a.index - b.index));
      let activeTab = visible.find((v) => { return v.totalElements != 0 });
      activeTab = activeTab !== undefined ? activeTab.index : 0;
      setCurrentTabIndex(activeTab);
    }
  }, []);

  const handleTabSelect = (e) => {
    setCurrentTabIndex(e);
  }

  const handleAdoptResult = () => {
    const preparedResult = prepareResultForDispatch();
    UIActions.setSearchById(preparedResult);
    ElementActions.dispatchSearchResult(preparedResult);
    handleCancel();
  }

  const prepareResultForDispatch = () => {
    let resultObject = {};
    results.map((val, i) => {
      let firstElements = searchResultsStore.tabSearchResultValues.find(tab => tab.id == `${val.id}-1`);
      resultObject[val.id] = {
        elements: firstElements.results.elements,
        ids: val.results.ids,
        page: val.results.page,
        pages: val.results.pages,
        perPage: val.results.per_page,
        totalElements: val.results.total_elements
      }
    });
    return resultObject;
  }

  const resultsCount = () => {
    const counts = results.map((val) => {
      return val.results.total_elements;
    });
    const sum = counts.reduce((a, b) => a + b, 0);
    return sum;
  }

  const searchResultNavItem = (list, tabResult) => {
    const elnElements = ['sample', 'reaction', 'screen', 'wellplate'];
    let iconClass = `icon-${list.key}`;
    let tooltipText = list.key && (list.key.replace('_', ' ').replace(/(^\w|\s\w)/g, m => m.toUpperCase()));
    
    if (!elnElements.includes(list.key)) {
      const genericElement = (genericElements && genericElements.find(el => el.name === list.key)) || {};
      iconClass = `${genericElement.icon_name} icon_generic_nav`;
      tooltipText = `${genericElement.label}<br />${genericElement.desc}`;
    }
    let tooltip = (
      <Tooltip id="_tooltip_history" className="left_tooltip">
        {tooltipText}
      </Tooltip>
    );
    let itemClass = tabResult.total_elements == 0 ? ' no-result' : '';

    return (
      <NavItem eventKey={list.index} key={`${list.key}_navItem`} className={`elements-list-tab${itemClass}`}>
        <OverlayTrigger delayShow={500} placement="top" overlay={tooltip}>
          <div style={{ display: 'flex' }}>
            <i className={iconClass} />
            <span style={{ paddingLeft: 5 }}>
              ({tabResult.total_elements})
            </span>
          </div>
        </OverlayTrigger>
      </NavItem>
    );
  }

  const SearchResultColumns = () => {
    const navItems = [];
    const tabContents = [];

    visibleTabs.map((list) => {
      const tab = results.find(val => val.id.indexOf(list.key) !== -1);
      if (tab === undefined) { return; }
      const tabResult = tab.results;

      const navItem = searchResultNavItem(list, tabResult);
      const tabContent =
        <SearchResultTabContent key={`${list.key}-result-tab`}
                                list={list} tabResult={tabResult}
        />

      navItems.push(navItem);
      tabContents.push(tabContent);
    });

    return (
      <>
        <Col sm={12}>
          <Navbar className="search-result-tab-navbar">
            <Nav bsStyle="tabs">
              {navItems}
            </Nav>
          </Navbar>
        </Col>
        <Col sm={12}>
          <Tab.Content className="search-result-tab-content" animation>
            {tabContents}
          </Tab.Content>
        </Col>
      </>
    );
  }

  return (
    <>
      <div>
        <h4>{resultsCount()} results</h4>
      </div>
      <Tab.Container
        id="tabList"
        defaultActiveKey={0}
        activeKey={currentTabIndex}
        onSelect={handleTabSelect}
      >
        <Row className="clearfix">
          <SearchResultColumns />
        </Row>
      </Tab.Container>
      <ButtonToolbar className="result-button-toolbar">
        <Button bsStyle="warning" onClick={handleCancel}>
          Cancel
        </Button>
        <Button bsStyle="info" onClick={handleRefind}>
          Reset
        </Button>
        <Button bsStyle="primary" onClick={handleAdoptResult} style={{ marginRight: '20px' }} >
          Adopt Result
        </Button>
      </ButtonToolbar>
    </>
  );
}

export default observer(SearchResult);
