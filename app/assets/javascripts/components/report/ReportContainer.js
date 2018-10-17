import React, { Component } from 'react';
import { Panel, Tabs, Tab } from 'react-bootstrap';
import ReportActions from '../actions/ReportActions';
import ReportStore from '../stores/ReportStore';
import UIStore from '../stores/UIStore';
import Setting from './Setting';
import Previews from './Previews';
import Orders from './Orders';
import Serials from './Serials';
import Archives from './Archives';
import Config from './Config';
import PanelHeader from '../common/PanelHeader';
import { CloseBtn, ResetBtn, GenerateReportBtn } from './ReportComponent';

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
    const state = UIStore.getState();
    this.onChangeUI(state);
    ReportActions.getArchives.defer();
  }

  componentWillUnmount() {
    ReportStore.unlisten(this.onChange);
    UIStore.unlisten(this.onChangeUI);
  }

  onChange(state) {
    this.setState({ ...state });
  }

  onChangeUI(state) {
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
    const { splSettings, checkedAllSplSettings, archives, activeKey,
      rxnSettings, checkedAllRxnSettings, imgFormat, fileName, template,
      configs, checkedAllConfigs, selectedObjs, selMolSerials,
      siRxnSettings, checkedAllSiRxnSettings, fileDescription,
      prdAtts, attThumbNails } = this.state;
    const archivesTitle = this.archivesTitle();

    return (
      <Panel
        bsStyle="default"
      >
        <Panel.Heading>{this.panelHeader()}</Panel.Heading>
        <Tabs
          activeKey={activeKey}
          onSelect={this.selectTab}
          id="report-tabs"
        >
          <Tab eventKey={0} title={'Config'}>
            <Config
              imgFormat={imgFormat}
              fileName={fileName}
              fileDescription={fileDescription}
              configs={configs}
              checkedAllConfigs={checkedAllConfigs}
              template={template}
              handleTemplateChanged={this.handleTemplateChanged}
            />
          </Tab>
          <Tab eventKey={1} title={'Setting'}>
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

          <Tab eventKey={2} title={'Order'}>
            <div className="panel-fit-screen">
              <Orders selectedObjs={selectedObjs} template={template} />
            </div>
          </Tab>
          <Tab eventKey={3} title={'Label'}>
            <div className="panel-fit-screen">
              <Serials selMolSerials={selMolSerials} template={template} />
            </div>
          </Tab>
          <Tab eventKey={4} title={'Preview'}>
            <div className="panel-fit-screen">
              <Previews
                selectedObjs={selectedObjs}
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
          <Tab eventKey={5} title={archivesTitle}>
            <div className="panel-fit-screen">
              <Archives archives={archives} />
            </div>
          </Tab>
        </Tabs>
      </Panel>
    );
  }
}
