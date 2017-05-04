import React, {Component} from 'react'
import {Panel, Button, Tabs, Tab, Row, Col, FormGroup, ControlLabel,
        FormControl, Tooltip, OverlayTrigger } from 'react-bootstrap';
import DetailActions from '../actions/DetailActions';
import ReportActions from '../actions/ReportActions';
import ReportStore from '../stores/ReportStore';
import UIActions from '../actions/UIActions';
import UIStore from '../stores/UIStore';

import Reports from './Reports';
import Orders from './Orders';
import Archives from './Archives';
import CheckBoxs from '../common/CheckBoxs';
import Select from 'react-select';
import paramize from './Paramize';

export default class ReportContainer extends Component {
  constructor(props) {
    super(props);
    this.state = {
      ...ReportStore.getState(),
    }
    this.onChange = this.onChange.bind(this);
    this.onChangeUI = this.onChangeUI.bind(this);
    this.updateQueue = this.updateQueue.bind(this);
  }

  componentDidMount() {
    ReportStore.listen(this.onChange);
    UIStore.listen(this.onChangeUI);
    let state = UIStore.getState();
    this.onChangeUI(state);
    ReportActions.getArchives.defer();
  }

  componentWillUnmount() {
    ReportStore.unlisten(this.onChange)
    UIStore.unlisten(this.onChangeUI)
  }

  onChange(state) {
    this.setState({...state})
  }

  onChangeUI(state) {
    const newTags = { sampleIds: state['sample'].checkedIds.toArray(),
                      reactionIds: state['reaction'].checkedIds.toArray() };
    const oldTags = this.state.selectedObjTags;
    ReportActions.updateCheckedTags.defer(oldTags, newTags);
  }

  renderHeader() {
    return (
      <div>
        Report Generation
        <div className="button-right">
          <Button bsStyle="danger"
                  bsSize="xsmall"
                  className="g-marginLeft--10 button-right"
                  onClick={(e) => DetailActions.close(this.props.report)}>
            <i className="fa fa-times"></i>
          </Button>
          {this.generateReportBtn()}
        </div>
      </div>
    )
  }

  render() {
    const { splSettings, checkedAllSplSettings,
            rxnSettings, checkedAllRxnSettings,
            configs, checkedAllConfigs,
            selectedObjs, archives, activeKey } = this.state;
    return (
      <Panel header={this.renderHeader()}
             bsStyle="default">

        <Tabs activeKey={activeKey}
              onSelect={this.selectTab}
              id="report-tabs" >
          <Tab eventKey={0} title={"Config"}>
            { this.renderConfig() }
          </Tab>

          <Tab eventKey={1} title={"Sample Setting"}>
            <CheckBoxs  items={splSettings}
                        toggleCheckbox={this.toggleSplSettings}
                        toggleCheckAll={this.toggleSplSettingsAll}
                        checkedAll={checkedAllSplSettings} />
          </Tab>

          <Tab eventKey={2} title={"Reaction Setting"}>
            <CheckBoxs  items={rxnSettings}
                        toggleCheckbox={this.toggleRxnSettings}
                        toggleCheckAll={this.toggleRxnSettingsAll}
                        checkedAll={checkedAllRxnSettings} />
          </Tab>

          <Tab eventKey={3} title={"Order"}>
            <div className="panel-fit-screen">
              <Orders selectedObjs={selectedObjs} />
            </div>
          </Tab>

          <Tab eventKey={4} title={"Report"}>
            <div className="panel-fit-screen">
              <Reports selectedObjs={selectedObjs}
                       splSettings={splSettings}
                       rxnSettings={rxnSettings}
                       configs={configs} />
            </div>
          </Tab>

          <Tab eventKey={5} title={this.archivesTitle()}>
            <div className="panel-fit-screen">
              <Archives archives={archives} />
            </div>
          </Tab>
        </Tabs>

      </Panel>
    );
  }

  renderConfig() {
    const { imgFormat, configs, checkedAllConfigs } = this.state;
    const imgFormatOpts = [
      { label: 'PNG', value: 'png'},
      { label: 'EPS', value: 'eps'},
      { label: 'EMF', value: 'emf'}
    ];
    const EPSwarning = (imgFormat == 'eps')
                    ? <p className="text-danger" style={{paddingTop: 12}}>
                        WARNING: EPS format is not supported by Microsoft Office
                      </p>
                    : null;
    return (
      <div>
        <br/>
        <FormGroup>
          <OverlayTrigger overlay={this.fileNameRule()}>
            <ControlLabel>
              File Name
            </ControlLabel>
          </OverlayTrigger>
          <FormControl type="text"
            value={this.state.fileName}
            onChange={e => ReportActions.updateFileName(e.target.value)}
          />
        </FormGroup>

        <FormGroup>
          <ControlLabel>File description</ControlLabel>
          <FormControl componentClass="textarea"
           onChange={e => ReportActions.updateFileDescription(e.target.value)}
           rows={2}
          />
        </FormGroup>

        <CheckBoxs  items={configs}
                    toggleCheckbox={this.toggleConfigs}
                    toggleCheckAll={this.toggleConfigsAll}
                    checkedAll={checkedAllConfigs} />

        <Row>
          <Col md={3} sm={8}>
            <label>Images format</label>
            <Select options={imgFormatOpts}
                    value={imgFormat}
                    clearable={false}
                    style={{width: 100}}
                    onChange={(e) => this.handleImgFormatChanged(e.value)}/>
          </Col>
          <Col md={9} sm={16}>
            <label></label>
            {EPSwarning}
          </Col>
        </Row>
      </div>
    );
  }

  fileNameRule() {
    return (
      <Tooltip id="file-name-rule" >
        <p>Max 40 characters.</p>
        <p>allowed: a to z, A to Z, 0 to 9, -, _</p>
      </Tooltip>
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

  toggleSplSettingsAll() {
    ReportActions.toggleSplSettingsCheckAll()
  }

  toggleRxnSettingsAll() {
    ReportActions.toggleRxnSettingsCheckAll()
  }

  toggleConfigsAll() {
    ReportActions.toggleConfigsCheckAll()
  }

  handleImgFormatChanged(e) {
    ReportActions.updateImgFormat(e);
  }

  selectTab(key) {
    ReportActions.updateActiveKey(key);
  }

  archivesTitle() {
    const unreadIds = this.unreadIds();
    const unReadBadge = unreadIds.length > 0
      ? <span className='badge-danger'>{unreadIds.length}</span>
      : null;

    return(
      <p>Archive {unReadBadge}</p>
    );
  }

  unreadIds() {
    let ids = [];
    this.state.archives.forEach( a => {
      if(a.unread) {
        ids = [...ids, a.id];
      }
    });
    return ids;
  }

  generateReportBtn() {
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
              onClick={this.generateReport.bind(this)}>
        <span><i className="fa fa-file-text-o"></i> Generate Report</span>
      </Button>
      :
      <Button bsStyle="danger"
              bsSize="xsmall"
              className="button-right">
        <span><i className="fa fa-spinner fa-pulse fa-fw"></i> Processing</span>
      </Button>
    )
  }

  generateReport() {
    const report = paramize(this.state);
    ReportActions.generateReport(report);
    setTimeout(this.updateProcessQueue.bind(this), 1000 * 10);
  }

  updateProcessQueue() {
    setTimeout(this.updateQueue, 1000 * 20);
    setTimeout(this.updateQueue, 1000 * 90);
    setTimeout(this.updateQueue, 1000 * 300);
  }

  updateQueue() {
    const { processings } = this.state;
    if(processings.length > 0) {
      ReportActions.updateProcessQueue.defer(processings);
    }
  }
}
