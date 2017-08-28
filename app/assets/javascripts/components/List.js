import React from 'react';
import _ from 'lodash';
import Immutable from 'immutable';
import {Tab, Button, Row, Col, Nav, NavItem,
        Popover, OverlayTrigger, ButtonToolbar} from 'react-bootstrap';

import ArrayUtils from './utils/ArrayUtils';

import ElementsTable from './ElementsTable';
import ElementsTableSettings from './ElementsTableSettings';

import ElementStore from './stores/ElementStore';
import UIStore from './stores/UIStore';
import UserStore from './stores/UserStore';

import UserActions from './actions/UserActions';
import UIActions from './actions/UIActions';
import KeyboardActions from './actions/KeyboardActions';

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
      totalCheckedElements: {
        sample: 0,
        reaction: 0,
        wellplate: 0,
        screen: 0,
        research_plan: 0
      }
    }

    this.onChange = this.onChange.bind(this)
    this.onChangeUser = this.onChangeUser.bind(this)
    this.onChangeUI = this.onChangeUI.bind(this)
    this.initState = this.initState.bind(this)
    this.handleTabSelect = this.handleTabSelect.bind(this)
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

  onChangeUI(state) {
    let { totalCheckedElements } = this.state;

    ["sample", "reaction", "wellplate", "screen", "research_plan"].forEach((type) => {
      let elementUI = state[type];
      let element   = ElementStore.getState()['elements'][type+"s"]
      if (elementUI.checkedAll) {
        totalCheckedElements[type] = element.totalElements - elementUI.uncheckedIds.size
      } else {
        totalCheckedElements[type] = elementUI.checkedIds.size
      }
    })

    this.setState({totalCheckedElements})
  }


  handleTabSelect(tab) {
    UserActions.selectTab(tab);

    // TODO sollte in tab action handler
    let uiState = UIStore.getState();
    let type = this.state.visible.get(tab);

    if (!uiState[type] || !uiState[type].page) return;

    let page = uiState[type].page;

    UIActions.setPagination({type: type, page: page});

    KeyboardActions.contextChange(type);
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
    let {
      visible, hidden, currentTab, treeView, 
      totalCheckedElements, 
    } = this.state

    const {overview, showReport} = this.props
    const elementState = this.state

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
            ({totalCheckedElements[value]})
          </i>
        </NavItem>
      )
      let tabContent = (
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
                      onSelect={(e) => this.handleTabSelect(e)}>
        <Row className="clearfix">
          <Col sm={12}>
            <Nav bsStyle="tabs">
              {navItems}
              &nbsp;&nbsp;&nbsp;
              <ElementsTableSettings
                visible={visible} hidden={hidden}
                ref="elementsTableSettings"/>
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
