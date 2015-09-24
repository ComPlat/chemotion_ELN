import React from 'react';
import ElementsTable from './ElementsTable';
import {TabbedArea, TabPane} from 'react-bootstrap';
import ElementStore from './stores/ElementStore';
import UIStore from './stores/UIStore';
import UIActions from './actions/UIActions';

export default class List extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      totalSampleElements: 0,
      totalReactionElements: 0,
      totalWellplatesElements: 0,
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
      totalWellplatesElements: state.elements.wellplates.totalElements
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
         {this.state.totalWellplatesElements} ({this._checkedElements('wellplate')}) 
      </i>;

    return (
      <TabbedArea defaultActiveKey={this.state.currentTab} activeKey={this.state.currentTab}
                  onSelect={(e) => this.handleTabSelect(e)}>
        <TabPane eventKey={1} tab={samples}>
          <ElementsTable type='sample'/>
        </TabPane>
        <TabPane eventKey={2} tab={reactions}>
          <ElementsTable type='reaction'/>
        </TabPane>
        <TabPane eventKey={3} tab={wellplates}>
          <ElementsTable type='wellplate'/>
        </TabPane>
      </TabbedArea>
    )
  }
}
