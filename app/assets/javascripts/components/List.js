import React from 'react';
import ElementsTable from './ElementsTable';
import {Tabs, Tab} from 'react-bootstrap';
import ElementStore from './stores/ElementStore';
import UIStore from './stores/UIStore';
import UIActions from './actions/UIActions';

export default class List extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      totalSampleElements: 0,
      totalReactionElements: 0,
      totalWellplateElements: 0,
      totalScreenElements: 0,
      currentTab: 1
    }
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
    ElementStore.listen(this.onChange.bind(this));
    UIStore.listen(this.onChangeUI.bind(this));
  }

  componentWillUnmount() {
    ElementStore.unlisten(this.onChange.bind(this));
    UIStore.unlisten(this.onChangeUI.bind(this));
  }

  onChange(state) {
    this.setState({
      totalSampleElements: state.elements.samples.totalElements,
      totalReactionElements: state.elements.reactions.totalElements,
      totalWellplateElements: state.elements.wellplates.totalElements,
      totalScreenElements: state.elements.screens.totalElements
    });
  }

  onChangeUI(state) {
    this.setState({
      currentTab: state.currentTab
    });
  }

  handleTabSelect(tab) {
    UIActions.selectTab(tab);

    // TODO sollte in tab action handler
    let type;

    switch(tab) {
      case 1:
        type = 'sample';
        break;
      case 2:
        type = 'reaction';
        break;
      case 3:
        type = 'wellplate';
        break;
      case 4:
        type = 'screen';
    }

    let uiState = UIStore.getState();
    let page = uiState[type].page;

    UIActions.setPagination({type: type, page: page})
  }

  render() {
    const {overview, showReport} = this.props;
    let samples =
      <i className="icon-sample">
         {this.state.totalSampleElements} ({this._checkedElements('sample')})
      </i>;
    let reactions =
      <i className="icon-reaction">
         {this.state.totalReactionElements} ({this._checkedElements('reaction')})
      </i>;
    let wellplates =
      <i className="icon-wellplate">
         {this.state.totalWellplateElements} ({this._checkedElements('wellplate')})
      </i>;
    let screens =
      <i className="icon-screen">
        {" " + this.state.totalScreenElements} ({this._checkedElements('screen')})
      </i>;

    return (
      <Tabs defaultActiveKey={this.state.currentTab} activeKey={this.state.currentTab}
                  onSelect={(e) => this.handleTabSelect(e)}>
        <Tab eventKey={1} title={samples}>
          <ElementsTable overview={overview} showReport={showReport} type='sample'/>
        </Tab>
        <Tab eventKey={2} title={reactions}>
          <ElementsTable overview={overview} showReport={showReport} type='reaction'/>
        </Tab>
        <Tab eventKey={3} title={wellplates}>
          <ElementsTable overview={overview} showReport={showReport} type='wellplate'/>
        </Tab>
        <Tab eventKey={4} title={screens}>
          <ElementsTable overview={overview} showReport={showReport} type='screen'/>
        </Tab>
      </Tabs>
    )
  }
}
