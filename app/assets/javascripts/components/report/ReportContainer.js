import React, {Component} from 'react'
import {Panel, Button, Tabs, Tab} from 'react-bootstrap';
import StickyDiv from 'react-stickydiv'
import Aviator from 'aviator';
import Utils from '../utils/Functions';

import ReportActions from '../actions/ReportActions';
import ReportStore from '../stores/ReportStore';
import UIActions from '../actions/UIActions';
import UIStore from '../stores/UIStore';
import ElementStore from '../stores/ElementStore';

import Reports from './Reports';
import Settings from './Settings';

export default class ReportContainer extends Component {
  constructor(props) {
    super(props);
    this.state = ReportStore.getState();
    this.onChange = this.onChange.bind(this);
    this.onChangeUI = this.onChangeUI.bind(this);
  }

  componentDidMount() {
    ReportStore.listen(this.onChange)
    UIStore.listen(this.onChangeUI)
    UIActions.selectTab.defer(2)
  }

  componentWillUnmount() {
    ReportStore.unlisten(this.onChange)
    UIStore.unlisten(this.onChangeUI)
  }

  onChange(state) {
    this.setState({
      settings: state.settings,
      checkedAll: state.checkedAll
    })
  }

  onChangeUI(state) {
    let checkedIds = state['reaction'].checkedIds.toArray()
    this.setState({selectedReactionIds: checkedIds})
    this.setSelectedReactions(checkedIds)
  }

  setSelectedReactions(selectedReactionIds) {
    let preSelectedReactions = this.state.selectedReactions
    let allReactions = preSelectedReactions.concat(ElementStore.state.elements.reactions.elements) || []

    let selectedReaction = selectedReactionIds.map( id => {
      return allReactions.map( reaction => {
        if(reaction.id === id){
          return reaction
        }
        return null
      }).filter(r => r!=null)[0]
    })
    this.setState({selectedReactions: selectedReaction})
  }

  render() {
    const submitLabel = (true) ? "Create" : "Save"; // TBD
    const style = {height: '220px'};
    //let reactions = this.state.reactions.checkedIds.toArray();

    return (
      <StickyDiv zIndex={2}>
        <Panel header="Report Generation"
               bsStyle="default">
          <div className="button-right">
            <Button bsStyle="primary"
                    bsSize="xsmall"
                    className="g-marginLeft--10"
                    onClick={this.generateReports.bind(this)}>
              <span><i className="fa fa-file-text-o"></i> Generate Report</span>
            </Button>
            <Button bsStyle="danger"
                    bsSize="xsmall"
                    className="g-marginLeft--10"
                    onClick={this.closeDetails.bind(this)}>
              <i className="fa fa-times"></i>
            </Button>
          </div>

          <Tabs defaultActiveKey={0} >
            <Tab eventKey={0} title={"Setting"}>
              <Settings settings={this.state.settings}
                        toggleCheckbox={this.toggleCheckbox}
                        toggleCheckAll={this.toggleCheckAll}
                        checkedAll={this.state.checkedAll} />
            </Tab>

            <Tab eventKey={1} title={"Report"}>
              <div className="panel-fit-screen">
                <Reports selectedReactions={this.state.selectedReactions} settings={this.state.settings} />
              </div>
            </Tab>
          </Tabs>

        </Panel>
      </StickyDiv>
    );
  }

  toggleCheckbox(text, checked){
    ReportActions.updateSettings({text, checked})
  }

  closeDetails() {
    UIActions.deselectAllElements();
    Aviator.navigate(`/collection/all`);
  }

  toggleCheckAll() {
    ReportActions.toggleSettingsCheckAll()
  }

  generateReports() {
    const ids = this.state.selectedReactionIds.join('_')
    const settings = this.state.settings.map(setting => {
      if(setting.checked){
        return setting.text
      } else {
        return null
      }
    }).filter(r => r!=null).join('_')

    Utils.downloadFile({
      contents: "api/v1/multiple_reports/rtf?ids=" + ids + "&settings=" + settings,
      name: "ELN-report_" + new Date().toISOString().slice(0,19)
    })
  }
}
