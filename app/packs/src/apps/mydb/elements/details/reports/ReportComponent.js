import React from 'react';
import { Button } from 'react-bootstrap';
import ReportActions from 'src/stores/alt/actions/ReportActions';
import UIActions from 'src/stores/alt/actions/UIActions';
import DetailActions from 'src/stores/alt/actions/DetailActions';
import paramize from 'src/apps/mydb/elements/details/reports/Paramize';

const clickToClose = (report) => {
  DetailActions.close(report);
};

const CloseBtn = ({ report }) => {
  const onClickToClose = () => clickToClose(report);

  return (
    <Button
      variant="danger"
      size="xxsm"
      onClick={onClickToClose}
    >
      <i className="fa fa-times" />
    </Button>
  );
};

const clickToReset = () => {
  ReportActions.reset();
  UIActions.uncheckWholeSelection.defer();
};

const ResetBtn = () => (
  <Button
    variant="info"
    size="xxsm"
    onClick={clickToReset}
  >
    <span><i className="fa fa-eraser" /> Reset</span>
  </Button>
);

const generateReport = (allState, updateQueue) => {
  const report = paramize(allState);
  ReportActions.generateReport(report);
};

const GenerateReportBtn = ({ allState, updateQueue }) => {
  const { selectedObjTags, defaultObjTags, splSettings, rxnSettings,
    processingReport } = allState;

  const hasObj = [...selectedObjTags.sampleIds,
  ...selectedObjTags.reactionIds, ...defaultObjTags.sampleIds,
  ...defaultObjTags.reactionIds].length !== 0;

  const showGeneReportBtn = [...splSettings, ...rxnSettings].map((settting) => {
    if (settting.checked) {
      return true;
    }
    return null;
  }).filter(r => r != null).length !== 0;

  const onClick = () => generateReport(allState, updateQueue);

  return (
    !processingReport
      ? <Button
        variant="primary"
        size="xxsm"
        disabled={!(showGeneReportBtn && hasObj)}
        onClick={onClick}
      >
        <span><i className="fa fa-file-text-o" /> Generate</span>
      </Button>
      : <Button
        variant="danger"
        size="sm"
      >
        <span><i className="fa fa-spinner fa-pulse fa-fw" /> Processing</span>
      </Button>
  );
};

export { CloseBtn, ResetBtn, GenerateReportBtn };
