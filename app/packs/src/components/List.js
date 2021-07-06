import React from 'react';
import _ from 'lodash';
import Immutable from 'immutable';
import { Tab, Row, Col, Nav, NavItem } from 'react-bootstrap';

import ArrayUtils from './utils/ArrayUtils';

import ElementsTable from './ElementsTable';
import ElementsTableSettings from './ElementsTableSettings';

import ElementStore from './stores/ElementStore';
import UIStore from './stores/UIStore';
import UserStore from './stores/UserStore';

import UserActions from './actions/UserActions';
import UIActions from './actions/UIActions';
import KeyboardActions from './actions/KeyboardActions';
import MatrixCheck from './common/MatrixCheck';

export default class List extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      totalElements: {},
      visible: Immutable.List(),
      hidden: Immutable.List(),
      genericEls: [],
      currentTab: 0,
      totalCheckedElements: {},
    };

    this.onChange = this.onChange.bind(this);
    this.onChangeUser = this.onChangeUser.bind(this);
    this.onChangeUI = this.onChangeUI.bind(this);
    this.initState = this.initState.bind(this);
    this.handleTabSelect = this.handleTabSelect.bind(this);
  }

  componentDidMount() {
    ElementStore.listen(this.onChange);
    UserStore.listen(this.onChangeUser);
    UIStore.listen(this.onChangeUI);

    this.initState();
  }

  componentWillUnmount() {
    ElementStore.unlisten(this.onChange);
    UserStore.unlisten(this.onChangeUser);
    UIStore.unlisten(this.onChangeUI);
  }

  shouldComponentUpdate(nextProps, nextState) {
    return nextProps.overview !== this.props.overview ||
    nextProps.showReport !== this.props.showReport ||
    nextProps.totalElements !== this.state.totalElements ||
    nextState.visible !== this.state.visible ||
    nextState.hidden !== this.state.hidden ||
    nextState.currentTab !== this.state.currentTab;
  }

  initState(){
    this.onChange(ElementStore.getState())
  }

  onChange(state) {
    const { totalElements } = this.state;
    Object.keys(state.elements).forEach((key) => {
      totalElements[key] = state.elements[key].totalElements;
    });

    this.setState({
      totalElements
    });
  }

  onChangeUser(state) {
    let visible = '';
    let hidden = '';
    let currentTabIndex = 0;

    const { currentType } = state
    let type = state.currentType

    if (typeof (state.profile) !== 'undefined' && state.profile &&
      typeof (state.profile.data) !== 'undefined' && state.profile.data) {
      visible = this.getArrayFromLayout(state.profile.data.layout, true)
      hidden = this.getArrayFromLayout(state.profile.data.layout, false)
      currentTabIndex = visible.findIndex(e => e === currentType)
      if (type === '') { type = visible.get(0); }
    }
    if (hidden.size === 0) {
      hidden = ArrayUtils.pushUniq(hidden, 'hidden');
    }

    if (currentTabIndex < 0) currentTabIndex = 0;

    if (typeof type !== 'undefined' && type != null) {
      KeyboardActions.contextChange.defer(type);
    }

    this.setState({
      currentTab: currentTabIndex,
      genericEls: state.genericEls || [],
      visible,
      hidden
    });
  }


  onChangeUI(state) {
    const { totalCheckedElements } = this.state;
    let forceUpdate = false;
    //const genericNames = (genericEls && genericEls.map(el => el.name)) || [];
    let klasses = [];
    const currentUser = (UserStore.getState() && UserStore.getState().currentUser) || {};
    if (MatrixCheck(currentUser.matrix, 'genericElement')) {
      klasses = UIStore.getState().klasses;
    }
    const elNames = ['sample', 'reaction', 'screen', 'wellplate', 'research_plan'].concat(klasses);

    elNames.forEach((type) => {
      let elementUI = state[type] || { checkedAll: false, checkedIds: [], uncheckedIds: [], currentId: null };
      const element = ElementStore.getState()['elements'][`${type}s`];
      const nextCount = elementUI.checkedAll ?
        (element.totalElements - elementUI.uncheckedIds.size) :
        elementUI.checkedIds.size;
      if (!forceUpdate && nextCount !== (totalCheckedElements[type] || 0)) { forceUpdate = true; }
      totalCheckedElements[type] = nextCount
    });

    this.setState((previousState) => { return { ...previousState, totalCheckedElements }; });
    // could not use shouldComponentUpdate because state.totalCheckedElements has already changed independently of setstate
    if (forceUpdate) { this.forceUpdate(); }
  }


  handleTabSelect(tab) {
    UserActions.selectTab(tab);

    // TODO sollte in tab action handler
    const uiState = UIStore.getState();
    const type = this.state.visible.get(tab);

    if (!uiState[type] || !uiState[type].page) { return; }

    const page = uiState[type].page;

    UIActions.setPagination({ type, page });

    KeyboardActions.contextChange(type);
  }

  getSortedHash(inputHash) {
    var resultHash = {};

    var keys = Object.keys(inputHash);
    keys.sort(function (a, b) {
      return inputHash[a] - inputHash[b]
    }).forEach(function (k) {
      resultHash[k] = inputHash[k];
    });
    return resultHash;
  }

  getArrayFromLayout(layout, isVisible) {
    let array = Immutable.List();

    if (isVisible == true) {
      layout = this.getSortedHash(layout);
    }

    Object.keys(layout).forEach(function (key, idx) {
      const order = layout[key]
      if (isVisible && order < 0) { return; }
      if (!isVisible && order > 0) { return; }

      if (isVisible == true) {
        array = array.set(idx+1, key)
      } else {
        array = array.set(Math.abs(order), key)
      }
    })

    array = array.filter(function(n) { return n != undefined })
    return array;
  }

  render() {
    let {
      visible, hidden, currentTab, totalCheckedElements
    } = this.state;
    const constEls = ['sample', 'reaction', 'screen', 'wellplate', 'research_plan'];
    const { overview, showReport } = this.props;
    const elementState = this.state;

    const navItems = []
    const tabContents = []
    for (let i = 0; i < visible.size; i++) {
      let value = visible.get(i)
      let camelized_value = value.split('_').map(function(word){
        return word.charAt(0).toUpperCase() + word.slice(1);
      }).join('');

      let iconClass = `icon-${value}`;

      if (!constEls.includes(value)) {
        const genericEl = (this.state.genericEls && this.state.genericEls.find(el => el.name == value)) || {};
        iconClass = `${genericEl.icon_name} icon_generic_nav`;
      }
      const navItem = (
        <NavItem eventKey={i} key={value + "_navItem"}>
          <i className={iconClass}>
            {elementState.totalElements && elementState.totalElements[`${value}s`]}
            ({totalCheckedElements[value] || 0})
          </i>
        </NavItem>
      )
      const tabContent = (
        <Tab.Pane eventKey={i} key={value + "_tabPanel"}>
           <ElementsTable overview={overview} showReport={showReport}
                         type={value}/>
        </Tab.Pane>
        )

      navItems.push(navItem)
      tabContents.push(tabContent)
    }

    return (
      <Tab.Container  id="tabList" defaultActiveKey={0} activeKey={currentTab}
                      onSelect={this.handleTabSelect}>
        <Row className="clearfix">
          <Col sm={12}>
            <Nav bsStyle="tabs">
              {navItems}
              &nbsp;&nbsp;&nbsp;
              <ElementsTableSettings
                visible={visible}
                hidden={hidden}
                ref={(m) => { this.elementsTableSettings = m; }}
              />
            </Nav>
          </Col>
          <Col sm={12}>
            <Tab.Content animation>
              {tabContents}
            </Tab.Content>
          </Col>
        </Row>
      </Tab.Container>
    )
  }
}
