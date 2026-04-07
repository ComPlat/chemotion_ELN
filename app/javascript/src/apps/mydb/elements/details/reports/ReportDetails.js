import React, {
  useCallback, useEffect, useMemo, useRef, useState
} from 'react';
import {
  Alert, Badge, Tabs, Tab
} from 'react-bootstrap';
import PropTypes from 'prop-types';
import {
  detailHeaderButton,
  detailFooterButton,
} from 'src/apps/mydb/elements/details/DetailCardButton';
import LoadingActions from 'src/stores/alt/actions/LoadingActions';
import ReportActions from 'src/stores/alt/actions/ReportActions';
import DetailActions from 'src/stores/alt/actions/DetailActions';
import ReportStore from 'src/stores/alt/stores/ReportStore';
import UIStore from 'src/stores/alt/stores/UIStore';
import UIActions from 'src/stores/alt/actions/UIActions';
import DetailCard from 'src/apps/mydb/elements/details/DetailCard';
import ElementIcon from 'src/components/common/ElementIcon';
import Setting from 'src/apps/mydb/elements/details/reports/Setting';
import Previews from 'src/apps/mydb/elements/details/reports/Previews';
import Orders from 'src/apps/mydb/elements/details/reports/Orders';
import Serials from 'src/apps/mydb/elements/details/reports/Serials';
import Archives from 'src/apps/mydb/elements/details/reports/Archives';
import Config from 'src/apps/mydb/elements/details/reports/Config';
import paramize from 'src/apps/mydb/elements/details/reports/Paramize';

const fetchPreviewTabs = [3, 4];

export default function ReportDetails({ report }) {
  const [state, setState] = useState(() => ({
    ...ReportStore.getState(),
  }));
  const stateRef = useRef(state);

  useEffect(() => {
    stateRef.current = state;
  }, [state]);

  const onChange = useCallback((nextState) => {
    setState({ ...nextState });
  }, []);

  const onChangeUI = useCallback((uiState) => {
    const reportState = stateRef.current;

    // Jump to config when in preview tab.
    if (fetchPreviewTabs.indexOf(reportState.activeKey) >= 0) {
      ReportActions.updateActiveKey.defer(2);
    }

    ReportActions.updateCheckedTags.defer({ uiState, reportState });
  }, []);

  useEffect(() => {
    ReportStore.listen(onChange);
    UIStore.listen(onChangeUI);

    onChangeUI(UIStore.getState());
    ReportActions.getArchives.defer();
    ReportActions.fetchTemplates.defer();

    return () => {
      ReportStore.unlisten(onChange);
      UIStore.unlisten(onChangeUI);
    };
  }, [onChange, onChangeUI]);

  const selectTab = useCallback((stringKey) => {
    if (stringKey == null) return;

    const key = parseInt(stringKey, 10);
    ReportActions.updateActiveKey(key);

    if (fetchPreviewTabs.indexOf(key) >= 0) {
      LoadingActions.start.defer();
      const reportState = ReportStore.getState();
      ReportActions.loadReview.defer({ reportState });
    }
  }, []);

  const clickToReset = useCallback(() => {
    ReportActions.reset();
    UIActions.uncheckWholeSelection.defer();
  }, []);

  const generateReport = useCallback(() => {
    const reportPayload = paramize(stateRef.current);
    ReportActions.generateReport(reportPayload);
  }, []);

  const handleClose = () => {
    if (report) {
      DetailActions.close(report, true);
    }
  };

  const unreadIds = useMemo(() => (
    state.archives
      .filter((a) => a.unread)
      .map((a) => a.id)
  ), [state.archives]);

  const hasSelectedObjects = useMemo(() => ([
    ...state.selectedObjTags.sampleIds,
    ...state.selectedObjTags.reactionIds,
    ...state.defaultObjTags.sampleIds,
    ...state.defaultObjTags.reactionIds,
  ].length > 0), [state.selectedObjTags, state.defaultObjTags]);

  const hasCheckedReportSettings = useMemo(() => (
    [...state.splSettings, ...state.rxnSettings].some((setting) => setting.checked)
  ), [state.splSettings, state.rxnSettings]);

  const disableGenerate = useMemo(() => (
    !(hasCheckedReportSettings && hasSelectedObjects)
  ), [hasCheckedReportSettings, hasSelectedObjects]);

  const archivesTitle = (
    <span className="d-flex align-items-center gap-1">
      Archive
      {unreadIds.length > 0 && (
        <Badge bg="danger">{unreadIds.length}</Badge>
      )}
    </span>
  );

  const resetButtonProps = {
    onClick: clickToReset,
    iconClass: 'fa fa-undo',
    label: 'Reset',
  };

  const generateButtonProps = {
    disabled: disableGenerate,
    onClick: generateReport,
    iconClass: 'fa fa-caret-square-o-right',
    label: 'Generate',
    variant: 'primary',
  };

  const processingButtonProps = {
    iconClass: 'fa fa-spinner fa-pulse',
    label: 'Processing',
    variant: 'primary',
  };

  const headerToolbar = (
    <>
      {detailHeaderButton(resetButtonProps)}
      {!state.processingReport ? (
        detailHeaderButton(generateButtonProps)
      ) : (
        detailHeaderButton(processingButtonProps)
      )}
    </>
  );

  const footerToolbar = (
    <>
      {detailFooterButton(resetButtonProps)}
      {!state.processingReport ? (
        detailFooterButton(generateButtonProps)
      ) : (
        detailFooterButton(processingButtonProps)
      )}
    </>
  );

  const {
    splSettings,
    checkedAllSplSettings,
    archives,
    activeKey,
    rxnSettings,
    checkedAllRxnSettings,
    imgFormat,
    fileName,
    configs,
    checkedAllConfigs,
    selectedObjs,
    selMolSerials,
    siRxnSettings,
    checkedAllSiRxnSettings,
    fileDescription,
    prdAtts,
    attThumbNails,
    previewObjs,
    templateOpts
  } = state;

  let { template } = state;
  let alertTemplateNotFound = false;

  if (templateOpts.length > 0 && template && typeof template !== 'object') {
    let templateOpt = templateOpts.find((x) => x.id === template || x.report_type === template);
    if (!templateOpt) {
      alertTemplateNotFound = true;
      templateOpt = templateOpts.find((x) => x.report_type === 'standard');
    }
    template = { id: templateOpt.id, label: templateOpt.name, value: templateOpt.report_type };
  }

  return (
    <DetailCard
      titleIcon={<ElementIcon element={report} />}
      title="Report Generation"
      headerToolbar={headerToolbar}
      footerToolbar={footerToolbar}
      onClose={handleClose}
    >
      {alertTemplateNotFound && (
        <Alert variant="primary">
          Report Template not found. Set to Standard. Please check your config settings.
        </Alert>
      )}
      <div className="tabs-container--with-borders">
        <Tabs
          activeKey={activeKey}
          onSelect={selectTab}
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
          <Tab eventKey={5} title={archivesTitle}>
            <Archives archives={archives} />
          </Tab>
        </Tabs>
      </div>
    </DetailCard>
  );
}

ReportDetails.propTypes = {
  report: PropTypes.shape({}),
};

ReportDetails.defaultProps = {
  report: null,
};
