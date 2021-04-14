import React from 'react';
import { Button } from 'react-bootstrap';
import ReportActions from '../actions/ReportActions';
import UIActions from '../actions/UIActions';
import DetailActions from '../actions/DetailActions';
import paramize from './Paramize';

const clickToClose = (report) => {
  DetailActions.close(report);
};

const CloseBtn = ({ report }) => {
  const onClickToClose = () => clickToClose(report);

  return (
    <Button
      bsStyle="danger"
      bsSize="xsmall"
      className="button-right"
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
    bsStyle="info"
    bsSize="xsmall"
    className="button-right"
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
        bsStyle="primary"
        bsSize="xsmall"
        className="button-right"
        disabled={!(showGeneReportBtn && hasObj)}
        onClick={onClick}
      >
        <span><i className="fa fa-file-text-o" /> Generate</span>
      </Button>
      : <Button
        bsStyle="danger"
        bsSize="xsmall"
        className="button-right"
      >
        <span><i className="fa fa-spinner fa-pulse fa-fw" /> Processing</span>
      </Button>
  );
};

export { CloseBtn, ResetBtn, GenerateReportBtn };
