import React, { useContext, useState, useEffect } from 'react';
import { Col, Navbar, Nav, NavItem, Row, Tab, OverlayTrigger, Tooltip, ButtonToolbar, Button } from 'react-bootstrap';
import { observer } from 'mobx-react';
import { StoreContext } from 'src/stores/mobx/RootStore';
import UserStore from 'src/stores/alt/stores/UserStore';
import ArrayUtils from 'src/utilities/ArrayUtils';
import SampleName from 'src/components/common/SampleName';

const SearchResult = ({ handleCancel }) => {
  const searchResultsStore = useContext(StoreContext).searchResults;
  const results = searchResultsStore.searchResultValues;
  const profile = UserStore.getState().profile || {};
  const [visibleTabs, setVisibleTabs] = useState([]);
  const [hiddenTabs, setHiddenTabs] = useState([]);
  const [currentTabIndex, setCurrentTabIndex] = useState(0);

  useEffect(() => {
    if (typeof (profile) !== 'undefined' && profile &&
      typeof (profile.data) !== 'undefined' && profile.data)  {
      const visible = [];
      const hidden = [];

      Object.entries(profile.data.layout).map((value) => {
        let index = value[1] - 1;
        if (value[1] > 0) {
          visible.push({ key: value[0], index: index });
        } else {
          hidden.push({ key: value[0], index: value[1] });
        }
      });
      setVisibleTabs(visible);
      setHiddenTabs(hidden);

      let newIndex = visibleTabs.findIndex((e) => {
        return currentTabIndex === e.index;
      });
      setCurrentTabIndex(visibleTabs.findIndex(e => currentTabIndex === e.index));
    }

    if (currentTabIndex < 0) setCurrentTabIndex(0);
  }, []);

  const resultsCount = () => {
    const counts = results.map((val) => {
      return val.results.total_elements;
    });
    const sum = counts.reduce((a, b) => a + b, 0);
    return sum;
  }

  const handleTabSelect = (e) => {
    setCurrentTabIndex(e);
  }

  const handleAdoptResult = () => {
    // push results to alt store
  }

  const SearchResultsList = () => {
    //console.log('result', results, resultsCount());
    // results[currentTabIndex].results
    var elements = results.find(val => val.id.indexOf(visibleTabs[2].key) !== -1);
    console.log('results', visibleTabs[2].key, elements.results, visibleTabs, hiddenTabs, currentTabIndex, profile.data);
    return (
      <>
        {
          results.map((val, i) => {
            return <div key={i}>{val.id}: {val.results.total_elements}</div>
          })
        }
        {
          visibleTabs.map((val, i) => {
            return <div key={i}>{val.key}</div>
          })
        }
      </>
    );
  }

  const searchResultNavItem = (list, tabResult) => {
    let iconClass = `icon-${list.key}`;
    // todo change iconClass for generic elements
    let ttl = (
      <Tooltip id="_tooltip_history" className="left_tooltip">
        {list.key && (list.key.replace('_', ' ').replace(/(^\w|\s\w)/g, m => m.toUpperCase()))}
      </Tooltip>
    );

    return (
      <NavItem eventKey={list.index} key={`${list.key}_navItem`} className={`elements-list-tab-${list.key}s`}>
        <OverlayTrigger delayShow={500} placement="top" overlay={ttl}>
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
      let tabContentList = <div key={list.index} className="search-result-tab-content-list">No results</div>;

      const navItem = searchResultNavItem(list, tabResult);

      if (tabResult.elements.length > 0) {
        tabContentList = tabResult.elements.map((obj, i) => {
          const moleculeName = list.key == "sample" ? <SampleName sample={obj} /> : '';
          return (
            <div key={i} className="search-result-tab-content-list">
              {moleculeName}
              {[obj.short_label, obj.name].join(" - ")}
            </div>
          )
        });
      }
      const tabContent = (
        <Tab.Pane eventKey={list.index} key={`${list.key}_tabPanel`}>
          <div style={{ overflowX: 'auto', maxHeight: '500px' }}>
            {tabContentList}
          </div>
        </Tab.Pane>
      );

      navItems.push(navItem);
      tabContents.push(tabContent);
    })

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
        <Button bsStyle="primary" onClick={handleAdoptResult} style={{ marginRight: '20px' }} >
          Adopt Result
        </Button>
      </ButtonToolbar>
    </>
  );
}

export default observer(SearchResult);
