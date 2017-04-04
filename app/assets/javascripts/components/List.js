import React from 'react';
import _ from 'lodash';
import Immutable from 'immutable';
import {Tab, Button, Row, Col, Nav, NavItem,
        Popover, OverlayTrigger, ButtonToolbar} from 'react-bootstrap';

import ArrayUtils from './utils/ArrayUtils';

import ElementsTable from './ElementsTable';
import TabLayoutContainer from './TabLayoutContainer';
import ContainerTree from './ContainerTree';

import ElementStore from './stores/ElementStore';
import UIStore from './stores/UIStore';
import UserStore from './stores/UserStore';

import UserActions from './actions/UserActions';
import UIActions from './actions/UIActions';
import KeyboardActions from './actions/KeyboardActions';
import ContainerActions from './actions/ContainerActions'

export default class List extends React.Component {
  constructor(props) {
    super(props);

    this.state = {
      totalSampleElements: 0,
      totalReactionElements: 0,
      totalWellplateElements: 0,
      totalScreenElements: 0,
      totalResearchPlanElements: 0,
      visible: Immutable.List(),
      hidden: Immutable.List(),
      currentTab: 0,
      treeView: false
    }

    this.onChange = this.onChange.bind(this)
    this.onChangeUser = this.onChangeUser.bind(this)
    this.initState = this.initState.bind(this)
    this.changeLayout = this.changeLayout.bind(this)
    this.handleTabSelect = this.handleTabSelect.bind(this)
    this.handleSwitch = this.handleSwitch.bind(this)

  }

  _checkedElements(type) {
    let elementUI = UIStore.getState()[type];
    let element   = ElementStore.getState()['elements'][type+"s"];
    if (elementUI.checkedAll) {
      return element.totalElements - elementUI.uncheckedIds.size;
    } else {
      return elementUI.checkedIds.size;
    }
  }

  componentDidMount() {
    ElementStore.listen(this.onChange);
    UserStore.listen(this.onChangeUser);

    this.initState();
  }

  componentWillUnmount() {
    ElementStore.unlisten(this.onChange);
    UserStore.unlisten(this.onChangeUser);

  }

  initState(){
    this.onChange(ElementStore.getState())
  }

  onChange(state) {
    this.setState({
      totalSampleElements: state.elements.samples.totalElements,
      totalReactionElements: state.elements.reactions.totalElements,
      totalWellplateElements: state.elements.wellplates.totalElements,
      totalScreenElements: state.elements.screens.totalElements,
      totalResearchPlanElements: state.elements.research_plans.totalElements
    });
  }

  onChangeUser(state) {
    let visible = this.getArrayFromLayout(state.currentUser.layout, true)
    let hidden = this.getArrayFromLayout(state.currentUser.layout, false)
    if (hidden.size == 0) {
      hidden = ArrayUtils.pushUniq(hidden, "hidden")
    }

    let currentType = state.currentType
    let currentTabIndex = visible.findIndex((e) => e === currentType)
    if (currentTabIndex < 0) currentTabIndex = 0;

    let type = state.currentType
    if (type == "") type = visible.get(0)

    KeyboardActions.contextChange.defer(type)

    this.setState({
      currentTab: currentTabIndex,
      visible: visible,
      hidden: hidden
    })
  }

  changeLayout() {
    let {visible, hidden} = this.refs.tabLayoutContainer.state

    let layout = {}

    visible.forEach(function (value, index) {
      layout[value] = (index + 1).toString()
    })
    hidden.forEach(function (value, index) {
      if (value != "hidden") layout[value] = (- index - 1).toString()
    })

    UserActions.changeLayout(layout)
  }

  handleTabSelect(tab) {
    UserActions.selectTab(tab);

    // TODO sollte in tab action handler
    let uiState = UIStore.getState();
    let type = this.state.visible.get(tab);

    if (!uiState[type] || !uiState[type].page) return;

    let page = uiState[type].page;

    if(this.state.treeView){
      ContainerActions.fetchTree(uiState.currentCollection.id, type)
    } else {
      UIActions.setPagination({type: type, page: page});
    }

    KeyboardActions.contextChange(type);
  }

  handleSwitch(){
    this.state.treeView = !this.state.treeView
    this.handleTabSelect(this.state.currentTab)
  }

  getArrayFromLayout(layout, isVisible) {
    let array = Immutable.List()

    Object.keys(layout).forEach(function (key) {
      let order = layout[key]
      if (isVisible && order < 0) return;
      if (!isVisible && order > 0) return;

      array = array.set(Math.abs(order), key)
    })

    array = array.filter(function(n){ return n != undefined })

    return array
  }

  render() {
    let {visible, hidden, currentTab, treeView} = this.state

    const {overview, showReport} = this.props
    const elementState = this.state
    let checkedElements = this._checkedElements

    let popoverLayout = (
      <Popover id="popover-layout" title="Tab Layout Editing"
               style={{maxWidth: "none"}}>
        <TabLayoutContainer visible={visible} hidden={hidden}
                            ref="tabLayoutContainer"/>
      </Popover>
    )

    let navItems = []
    let tabContents = []
    for (let i = 0; i < visible.size; i++) {
      let value = visible.get(i)
      let camelized_value = value.split('_').map(function(word){
        return word.charAt(0).toUpperCase() + word.slice(1);
      }).join('');

      let navItem = (
        <NavItem eventKey={i} key={value + "_navItem"}>
          <i className={"icon-" + value}>
            {elementState["total" + camelized_value + "Elements"]}
            ({checkedElements(value)})
          </i>
        </NavItem>
      )
      let tabContent = (
        <Tab.Pane eventKey={i} key={value + "_tabPanel"}>
          {treeView
            ? <ContainerTree type={value} />
            : <ElementsTable overview={overview} showReport={showReport}
                         type={value}/>
          }
        </Tab.Pane>
        )

      navItems.push(navItem)
      tabContents.push(tabContent)
    }

    return (
      <Tab.Container id="tabList" defaultActiveKey={0} activeKey={currentTab}
                     onSelect={(e) => this.handleTabSelect(e)}>
        <Row className="clearfix">
          <Col sm={12}>
            <Nav bsStyle="tabs">
              {navItems}
              &nbsp;&nbsp;&nbsp;
              <Button bsSize="xsmall" bsStyle="danger"
                onClick={() => this.handleSwitch()}>
                <span className="fa fa-exchange"></span>
              </Button>
              &nbsp;&nbsp;&nbsp;
              <OverlayTrigger trigger="click" placement="bottom"
                              overlay={popoverLayout} rootClose
                              onExit={() => this.changeLayout()}>
                <Button bsSize="xsmall" bsStyle="danger"
                        style={{marginTop: "9px"}}>
                  <i className="fa fa-cog"></i>
                </Button>
              </OverlayTrigger>
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
