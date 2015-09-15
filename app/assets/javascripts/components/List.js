import React from 'react';
import ElementsTable from './ElementsTable';
import {TabbedArea, TabPane} from 'react-bootstrap';
import ElementStore from './stores/ElementStore';
import UIStore from './stores/UIStore';
import UIActions from './actions/UIActions';
import Wellplate from './Wellplate';

export default class List extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      totalSampleElements: 0,
      currentTab: 1
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
      totalSampleElements: state.elements.samples.totalElements
    });
  }

  onChangeUI(state) {
    this.setState({
      currentTab: state.currentTab
    });
  }

  handleTabSelect(tab) {
    UIActions.selectTab(tab);
  }

  render() {
    let samples = <i className="icon-sample"> {this.state.totalSampleElements} </i>,
        reactions = <i className="icon-reaction"></i>,
        wellplates = <i className="icon-wellplate"></i>;
    return (
      <TabbedArea defaultActiveKey={this.state.currentTab} activeKey={this.state.currentTab} onSelect={(e) => this.handleTabSelect(e)}>
        <TabPane eventKey={1} tab={samples}>
          <ElementsTable type='sample'/>
        </TabPane>
        <TabPane eventKey={2} tab={reactions}>
          <ElementsTable type='reaction'/>
        </TabPane>
        <TabPane eventKey={3} tab={wellplates}>
          <Wellplate {...wellplate} handleDataChange={wells => this.handleWellplateChange(wells)}/>
        </TabPane>
      </TabbedArea>
    )
  }
}

let wellplate = {
  rows: 4,
  cols: 4,
  wells: [{
    id: 1,
    text: '1'
  }, {
    id: 2,
    text: '2'
  }, {
    id: 3,
    text: '3'
  }, {
    id: 4,
    text: '4'
  }, {
    id: 5,
    text: '5'
  }, {
    id: 6,
    text: '6'
  }, {
    id: 7,
    text: '7'
  }, {
    id: 8,
    text: '8'
  }, {
    id: 9,
    text: '9'
  }, {
    id: 10,
    text: '10'
  }]
};
