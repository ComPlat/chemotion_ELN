import React, { Component } from 'react';
import {
  Alert, Badge, Tabs, Tab
} from 'react-bootstrap';
import LoadingActions from 'src/stores/alt/actions/LoadingActions';
import ReportActions from 'src/stores/alt/actions/ReportActions';
import ReportStore from 'src/stores/alt/stores/ReportStore';
import UIStore from 'src/stores/alt/stores/UIStore';
import DetailCard from 'src/apps/mydb/elements/details/DetailCard';
import Setting from 'src/apps/mydb/elements/details/reports/Setting';
import Previews from 'src/apps/mydb/elements/details/reports/Previews';
import Orders from 'src/apps/mydb/elements/details/reports/Orders';
import Serials from 'src/apps/mydb/elements/details/reports/Serials';
import Archives from 'src/apps/mydb/elements/details/reports/Archives';
import Config from 'src/apps/mydb/elements/details/reports/Config';
import { CloseBtn, ResetBtn, GenerateReportBtn } from 'src/apps/mydb/elements/details/reports/ReportComponent';

const fetchPreviewTabs = [3, 4];

export default class ReportContainer extends Component {
  constructor(props) {
    super(props);
    this.state = {
      ...ReportStore.getState(),
    };
    this.onChange = this.onChange.bind(this);
    this.onChangeUI = this.onChangeUI.bind(this);
    this.updateQueue = this.updateQueue.bind(this);
  }

  componentDidMount() {
    ReportStore.listen(this.onChange);
    UIStore.listen(this.onChangeUI);
    const uiState = UIStore.getState();
    this.onChangeUI(uiState);
    ReportActions.getArchives.defer();
    ReportActions.fetchTemplates.defer();
  }

  componentWillUnmount() {
    ReportStore.unlisten(this.onChange);
    UIStore.unlisten(this.onChangeUI);
  }

  onChange(state) {
    this.setState({ ...state });
  }

  onChangeUI(uiState) {
    // jump to config when in the preview
    const { activeKey } = this.state;
    if (fetchPreviewTabs.indexOf(activeKey) >= 0) {
      ReportActions.updateActiveKey.defer(2);
    }
    // load list data only
    const state = { uiState, reportState: this.state };
    ReportActions.updateCheckedTags.defer(state);
  }

  selectTab(stringKey) {
    const key = parseInt(stringKey, 10);
    ReportActions.updateActiveKey(key);
    if (fetchPreviewTabs.indexOf(key) >= 0) { // preview
      LoadingActions.start.defer();
      const reportState = ReportStore.getState();
      ReportActions.loadReview.defer({ reportState });
    }
  }

  archivesTitle() {
    const unreadIds = this.unreadIds();

    return (
      <span className="d-flex align-items-center gap-1">
        Archive
        {unreadIds.length > 0 && (
          <Badge bg="danger">{unreadIds.length}</Badge>
        )}
      </span>
    );
  }

  unreadIds() {
    const { archives } = this.state;
    return archives
      .filter((a) => a.unread)
      .map((a) => a.id);
  }

  updateQueue() {
    const { processings } = this.state;
    if (processings.length > 0) {
      ReportActions.updateProcessQueue.defer(processings);
    }
  }

  reportHeader() {
    return (
      <div className='d-flex align-items-center justify-content-between'>
        Report Generation
        <div className="d-flex gap-1">
          <ResetBtn key="resetBtn" />
          <GenerateReportBtn
            key="generateReportBtn"
            allState={this.state}
            updateQueue={this.updateQueue}
          />
          <CloseBtn key="closeBtn" report={report} />
        </div>
      </div>
    );
  }

  render() {
    const {
      splSettings, checkedAllSplSettings, archives, activeKey,
      rxnSettings, checkedAllRxnSettings, imgFormat, fileName,
      configs, checkedAllConfigs, selectedObjs, selMolSerials,
      siRxnSettings, checkedAllSiRxnSettings, fileDescription,
      prdAtts, attThumbNails, previewObjs, templateOpts
    } = this.state;

    let { template } = this.state;
    let alertTemplateNotFound = false;

    if (templateOpts.length > 0 && template && typeof template != 'object') {
      let templateOpt = templateOpts.find(x => x.id == template || x.report_type == template);
      if (!templateOpt) {
        alertTemplateNotFound = true;
        templateOpt = templateOpts.find(x => x.report_type === 'standard')
      }
      template = { id: templateOpt.id, label: templateOpt.name, value: templateOpt.report_type };
    }

    const { report } = this.props;
    return (
      <DetailCard
        header={this.reportHeader()}
      >
        {alertTemplateNotFound && (
          <Alert variant="warning">
            Report Template not found. Set to Standard. Please check your config settings.
          </Alert>
        )}
        <div className="tabs-container--with-borders">
          <Tabs
            activeKey={activeKey}
            onSelect={this.selectTab}
            id="report-tabs"
          >
            <Tab eventKey={0} title="Config">
              <Config
                imgFormat={imgFormat}
                fileName={fileName}
                fileDescription={fileDescription}
                configs={configs}
                checkedAllConfigs={checkedAllConfigs}
                template={template}
                handleTemplateChanged={this.handleTemplateChanged}
                options={templateOpts}
              />
            </Tab>
            <Tab eventKey={1} title="Setting">
              <Setting
                template={template}
                splSettings={splSettings}
                checkedAllSplSettings={checkedAllSplSettings}
                rxnSettings={rxnSettings}
                checkedAllRxnSettings={checkedAllRxnSettings}
                siRxnSettings={siRxnSettings}
                checkedAllSiRxnSettings={checkedAllSiRxnSettings}
              />
            </Tab>

            <Tab eventKey={2} title="Order">
              <Orders selectedObjs={selectedObjs} template={template} />
            </Tab>
            <Tab eventKey={3} title="Label">
              <Serials selMolSerials={selMolSerials} template={template} />
            </Tab>
            <Tab eventKey={4} title="Preview">
              <Previews
                previewObjs={previewObjs}
                splSettings={splSettings}
                rxnSettings={rxnSettings}
                siRxnSettings={siRxnSettings}
                configs={configs}
                template={template}
                molSerials={selMolSerials}
                prdAtts={prdAtts}
                attThumbNails={attThumbNails}
              />
            </Tab>
            <Tab eventKey={5} title={this.archivesTitle()}>
              <Archives archives={archives} />
            </Tab>
          </Tabs>
        </div>
      </DetailCard>
    );
  }
}
