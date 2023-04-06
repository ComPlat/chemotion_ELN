import React, { Component } from 'react';
import { Alert, Panel, Tabs, Tab } from 'react-bootstrap';
import LoadingActions from 'src/stores/alt/actions/LoadingActions';
import ReportActions from 'src/stores/alt/actions/ReportActions';
import ReportStore from 'src/stores/alt/stores/ReportStore';
import UIStore from 'src/stores/alt/stores/UIStore';
import Setting from 'src/apps/mydb/elements/details/reports/Setting';
import Previews from 'src/apps/mydb/elements/details/reports/Previews';
import Orders from 'src/apps/mydb/elements/details/reports/Orders';
import Serials from 'src/apps/mydb/elements/details/reports/Serials';
import Archives from 'src/apps/mydb/elements/details/reports/Archives';
import Config from 'src/apps/mydb/elements/details/reports/Config';
import PanelHeader from 'src/components/common/PanelHeader';
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
    this.panelHeader = this.panelHeader.bind(this);
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

  panelHeader() {
    const { report } = this.props;
    const allState = this.state;
    const btns = [
      <CloseBtn key="closeBtn" report={report} />,
      <GenerateReportBtn
        key="generateReportBtn"
        allState={allState}
        updateQueue={this.updateQueue}
      />,
      <ResetBtn key="resetBtn" />,
    ];
    return <PanelHeader title="Report Generation" btns={btns} />;
  }

  selectTab(key) {
    ReportActions.updateActiveKey(key);
    if (fetchPreviewTabs.indexOf(key) >= 0) { // preview
      LoadingActions.start.defer();
      const reportState = ReportStore.getState();
      ReportActions.loadRreview.defer({ reportState });
    }
  }

  archivesTitle() {
    const unreadIds = this.unreadIds();
    const unReadBadge = unreadIds.length > 0
      ? <span className="badge-danger">{unreadIds.length}</span>
      : null;

    return (
      <span>Archive {unReadBadge}</span>
    );
  }

  unreadIds() {
    let ids = [];
    this.state.archives.forEach((a) => {
      if (a.unread) {
        ids = [...ids, a.id];
      }
    });
    return ids;
  }

  updateQueue() {
    const { processings } = this.state;
    if (processings.length > 0) {
      ReportActions.updateProcessQueue.defer(processings);
    }
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

    const archivesTitle = this.archivesTitle();
    const tabStyle = {padding: "15px", border: "1px solid #ddd", borderRadius: "4px"}
    return (
      <Panel
        bsStyle="default"
      >
        {alertTemplateNotFound && (
          <Alert variant="warning">
            Report Template not found. Set to Standard. Please check your config settings.
          </Alert>
        )}
        <Panel.Heading>{this.panelHeader()}</Panel.Heading>
        <Tabs
          activeKey={activeKey}
          onSelect={this.selectTab}
          id="report-tabs"
          style={{padding:"15px"}}
        >
          <Tab eventKey={0} title="Config" style={tabStyle}>
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
          <Tab eventKey={1} title="Setting" style={tabStyle}>
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

          <Tab eventKey={2} title="Order" style={tabStyle}>
            <div className="panel-fit-screen">
              <Orders selectedObjs={selectedObjs} template={template} />
            </div>
          </Tab>
          <Tab eventKey={3} title="Label" style={tabStyle}>
            <div className="panel-fit-screen">
              <Serials selMolSerials={selMolSerials} template={template} />
            </div>
          </Tab>
          <Tab eventKey={4} title="Preview" style={tabStyle}>
            <div className="panel-fit-screen">
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
            </div>
          </Tab>
          <Tab eventKey={5} title={archivesTitle} style={tabStyle}>
            <div className="panel-fit-screen">
              <Archives archives={archives} />
            </div>
          </Tab>
        </Tabs>
      </Panel>
    );
  }
}
