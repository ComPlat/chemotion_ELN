import Immutable from 'immutable';
import React from 'react';
import { Col, Nav, NavItem, Row, Tab, OverlayTrigger, Tooltip } from 'react-bootstrap';
import KeyboardActions from 'src/stores/alt/actions/KeyboardActions';
import UIActions from 'src/stores/alt/actions/UIActions';
import UserActions from 'src/stores/alt/actions/UserActions';
import MatrixCheck from 'src/components/common/MatrixCheck';
import ElementsTable from 'src/apps/mydb/elements/list/ElementsTable';
import ElementsTableSettings from 'src/apps/mydb/elements/list/ElementsTableSettings';
import ElementStore from 'src/stores/alt/stores/ElementStore';
import UIStore from 'src/stores/alt/stores/UIStore';
import UserStore from 'src/stores/alt/stores/UserStore';
import ArrayUtils from 'src/utilities/ArrayUtils';


function getSortedHash(inputHash) {
  const resultHash = {};

  const keys = Object.keys(inputHash);
  keys.sort((a, b) => inputHash[a] - inputHash[b]).forEach((k) => {
    resultHash[k] = inputHash[k];
  });
  return resultHash;
}

function getArrayFromLayout(layout, isVisible) {
  let array = Immutable.List();
  let sortedLayout = layout;

  if (isVisible == true) {
    sortedLayout = getSortedHash(sortedLayout);
  }

  Object.keys(sortedLayout).forEach((key, idx) => {
    const order = sortedLayout[key];
    if (isVisible && order < 0) { return; }
    if (!isVisible && order > 0) { return; }

    if (isVisible == true) {
      array = array.set(idx + 1, key);
    } else {
      array = array.set(Math.abs(order), key);
    }
  });

  array = array.filter(n => n != undefined);
  return array;
}

export default class ElementsList extends React.Component {
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

  shouldComponentUpdate(nextProps, nextState) {
    return nextProps.overview !== this.props.overview ||
      nextProps.showReport !== this.props.showReport ||
      nextProps.totalElements !== this.state.totalElements ||
      nextState.visible !== this.state.visible ||
      nextState.hidden !== this.state.hidden ||
      nextState.currentTab !== this.state.currentTab;
  }

  componentWillUnmount() {
    ElementStore.unlisten(this.onChange);
    UserStore.unlisten(this.onChangeUser);
    UIStore.unlisten(this.onChangeUI);
  }

  onChange(state) {
    const { totalElements } = this.state;
    Object.keys(state.elements).forEach((key) => {
      totalElements[key] = state.elements[key]?.totalElements;
    });

    this.setState({
      totalElements
    });
  }

  onChangeUser(state) {
    let visible = '';
    let hidden = '';
    let currentTabIndex = 0;

    const { currentType } = state;
    let type = state.currentType;

    if (typeof (state.profile) !== 'undefined' && state.profile &&
      typeof (state.profile.data) !== 'undefined' && state.profile.data) {
      visible = getArrayFromLayout(state.profile.data.layout, true);
      hidden = getArrayFromLayout(state.profile.data.layout, false);
      currentTabIndex = visible.findIndex(e => e === currentType);
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
    // const genericNames = (genericEls && genericEls.map(el => el.name)) || [];
    let klasses = [];
    const currentUser = (UserStore.getState() && UserStore.getState().currentUser) || {};
    if (MatrixCheck(currentUser.matrix, 'genericElement')) {
      klasses = UIStore.getState().klasses;
    }
    const elNames = ['sample', 'reaction', 'screen', 'wellplate', 'research_plan'].concat(klasses);

    elNames.forEach((type) => {
      const elementUI = state[type] || {
        checkedAll: false, checkedIds: [], uncheckedIds: [], currentId: null
      };
      const element = ElementStore.getState().elements[`${type}s`];
      const nextCount = elementUI.checkedAll ?
        (element.totalElements - elementUI.uncheckedIds.size) :
        elementUI.checkedIds.size;
      if (!forceUpdate && nextCount !== (totalCheckedElements[type] || 0)) { forceUpdate = true; }
      totalCheckedElements[type] = nextCount;
    });

    this.setState(previousState => ({ ...previousState, totalCheckedElements }));
    // could not use shouldComponentUpdate because state.totalCheckedElements
    // has already changed independently of setstate
    if (forceUpdate) { this.forceUpdate(); }
  }

  handleTabSelect(tab) {
    UserActions.selectTab(tab);

    // TODO sollte in tab action handler
    const uiState = UIStore.getState();
    const type = this.state.visible.get(tab);

    if (!uiState[type] || !uiState[type].page) { return; }

    const { page } = uiState[type];

    UIActions.setPagination({ type, page });

    KeyboardActions.contextChange(type);
  }

  initState() {
    this.onChange(ElementStore.getState());
  }

  render() {
    const {
      visible, hidden, currentTab, totalCheckedElements
    } = this.state;
    const constEls = ['sample', 'reaction', 'screen', 'wellplate', 'research_plan'];
    const { overview, showReport } = this.props;
    const elementState = this.state;

    const navItems = [];
    const tabContents = [];
    for (let i = 0; i < visible.size; i += 1) {
      const value = visible.get(i);

      let iconClass = `icon-${value}`;
      let ttl = (<Tooltip id="_tooltip_history" className="left_tooltip">{value && (value.replace('_', ' ').replace(/(^\w|\s\w)/g, m => m.toUpperCase()))}</Tooltip>);

      if (!constEls.includes(value)) {
        const genericEl = (this.state.genericEls &&
          this.state.genericEls.find(el => el.name === value)) || {};
        iconClass = `${genericEl.icon_name} icon_generic_nav`;
        ttl = (<Tooltip id="_tooltip_history" className="left_tooltip">{genericEl.label}<br />{genericEl.desc}</Tooltip>);
      }


      const navItem = (
        <NavItem eventKey={i} key={`${value}_navItem`} className={`elements-list-tab-${value}s`}>
          <OverlayTrigger delayShow={500} placement="top" overlay={ttl}>
            <i className={iconClass} />
          </OverlayTrigger>
          <span style={{ paddingLeft: 5 }}>
            {elementState.totalElements &&
              elementState.totalElements[`${value}s`]}
            ({totalCheckedElements[value] || 0})
          </span>
        </NavItem>
      );
      const tabContent = (
        <Tab.Pane eventKey={i} key={`${value}_tabPanel`}>
          <ElementsTable
            overview={overview}
            showReport={showReport}
            type={value}
          />
        </Tab.Pane>
      );

      navItems.push(navItem);
      tabContents.push(tabContent);
    }

    return (
      <Tab.Container
        id="tabList"
        defaultActiveKey={0}
        activeKey={currentTab}
        onSelect={this.handleTabSelect}
      >
        <Row className="clearfix">
          <Col sm={12}>
            <Nav bsStyle="tabs">
              {navItems}
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
    );
  }
}
