import React, {Component} from 'react'
import {Panel, Button, Tabs, Tab, Row, Col } from 'react-bootstrap';

import ReportActions from '../actions/ReportActions';
import ReportStore from '../stores/ReportStore';
import UIActions from '../actions/UIActions';
import UIStore from '../stores/UIStore';

import Reports from './Reports';
import Orders from './Orders';
import CheckBoxs from '../common/CheckBoxs';
import Select from 'react-select';

export default class ReportContainer extends Component {
  constructor(props) {
    super(props);
    this.state = {
      ...ReportStore.getState(),
    }
    this.onChange = this.onChange.bind(this);
    this.onChangeUI = this.onChangeUI.bind(this);
  }

  componentDidMount() {
    ReportStore.listen(this.onChange)
    UIStore.listen(this.onChangeUI)
    let state = UIStore.getState();
    this.onChangeUI(state)
  }

  componentWillUnmount() {
    ReportStore.unlisten(this.onChange)
    UIStore.unlisten(this.onChangeUI)
  }

  onChange(state) {
    this.setState({...state})
  }

  onChangeUI(state) {
    const checkedTags = { sampleIds: state['sample'].checkedIds.toArray(),
                          reactionIds: state['reaction'].checkedIds.toArray() }
    ReportActions.updateCheckedTags.defer(checkedTags);
  }

  handleImgFormatChanged(e) {
    ReportActions.updateImgFormat(e);
  }

  render() {
    const imgFormatOpts = [
      { label: 'PNG', value: 'png'},
      { label: 'EPS', value: 'eps'},
      { label: 'EMF', value: 'emf'}
    ];
    let EPSwarning = (this.state.imgFormat == 'eps')
                    ?
                      <p className="text-danger" style={{paddingTop: 12}}>
                        WARNING: EPS format is not supported by Microsoft Office
                      </p>
                    :
                      null;
    return (
      <Panel header="Report Generation"
             bsStyle="default">
        <div className="button-right">
          {this.generateReportsBtn()}
          <Button bsStyle="danger"
                  bsSize="xsmall"
                  className="g-marginLeft--10"
                  onClick={this.closeDetails.bind(this)}>
            <i className="fa fa-times"></i>
          </Button>
        </div>

        <Tabs defaultActiveKey={0} id="report-tabs" >
          <Tab eventKey={0} title={"Sample Setting"}>
            <CheckBoxs  items={this.state.splSettings}
                        toggleCheckbox={this.toggleSplSettings}
                        toggleCheckAll={this.toggleSplSettingsAll}
                        checkedAll={this.state.checkedAllSplSettings} />
          </Tab>

          <Tab eventKey={1} title={"Reaction Setting"}>
            <CheckBoxs  items={this.state.rxnSettings}
                        toggleCheckbox={this.toggleRxnSettings}
                        toggleCheckAll={this.toggleRxnSettingsAll}
                        checkedAll={this.state.checkedAllRxnSettings} />
          </Tab>

          <Tab eventKey={2} title={"Config"}>
            <CheckBoxs  items={this.state.configs}
                        toggleCheckbox={this.toggleConfigs}
                        toggleCheckAll={this.toggleConfigsAll}
                        checkedAll={this.state.checkedAllConfigs} />
            <Row>
              <Col md={3} sm={8}>
                <label>Images format</label>
                <Select options={imgFormatOpts}
                        value={this.state.imgFormat}
                        clearable={false}
                        style={{width: 100}}
                        onChange={(e) => this.handleImgFormatChanged(e)}/>
              </Col>
              <Col md={9} sm={16}>
                <label></label>
                {EPSwarning}
              </Col>
            </Row>
          </Tab>

          <Tab eventKey={3} title={"Order"}>
            <div className="panel-fit-screen">
              <Orders selectedObjs={this.state.selectedObjs} />
            </div>
          </Tab>

          <Tab eventKey={4} title={"Report"}>
            <div className="panel-fit-screen">
              <Reports selectedObjs={this.state.selectedObjs}
                       splSettings={this.state.splSettings}
                       rxnSettings={this.state.rxnSettings}
                       configs={this.state.configs} />
            </div>
          </Tab>
        </Tabs>

      </Panel>
    );
  }

  toggleSplSettings(text, checked){
    ReportActions.updateSplSettings({text, checked})
  }

  toggleRxnSettings(text, checked){
    ReportActions.updateRxnSettings({text, checked})
  }

  toggleConfigs(text, checked){
    ReportActions.updateConfigs({text, checked})
  }

  closeDetails() {
    UIActions.uncheckWholeSelection();
    UIActions.deselectAllElements()
  }

  toggleSplSettingsAll() {
    ReportActions.toggleSplSettingsCheckAll()
  }

  toggleRxnSettingsAll() {
    ReportActions.toggleRxnSettingsCheckAll()
  }

  toggleConfigsAll() {
    ReportActions.toggleConfigsCheckAll()
  }

  generateReports() {
    ReportActions.generateReports()
  }

  generateReportsBtn() {
    const { sampleIds, reactionIds } = this.state.selectedObjTags;
    const hasObj = [...sampleIds, ...reactionIds].length !== 0 ? true : false;

    const showGeneReportBtn = [...this.state.splSettings,
                               ...this.state.rxnSettings].map(setting => {
      if(setting.checked){
        return true
      }
    }).filter(r => r!=null).length !== 0 ? true : false

    return (
      !this.state.processingReport ?
      <Button bsStyle="primary"
              bsSize="xsmall"
              className="button-right"
              disabled={!(showGeneReportBtn && hasObj)}
              onClick={this.generateReports.bind(this)}>
        <span><i className="fa fa-file-text-o"></i> Generate Report</span>
      </Button>
      :
      <Button bsStyle="danger"
              bsSize="xsmall"
              className="button-right">
        <span><i className="fa fa-spinner fa-pulse fa-fw"></i> Processing your report, please wait...</span>
      </Button>
    )
  }
}
