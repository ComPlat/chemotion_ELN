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
      currentTab: 3
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
          <Wellplate />
        </TabPane>
      </TabbedArea>
    )
  }
}
