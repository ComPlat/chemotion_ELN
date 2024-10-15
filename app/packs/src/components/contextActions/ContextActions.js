import React from 'react';
import PropTypes from 'prop-types';
import { ButtonGroup, ButtonToolbar } from 'react-bootstrap';
import CreateButton from 'src/components/contextActions/CreateButton';
import SplitElementButton from 'src/components/contextActions/SplitElementButton';
import ReportUtilButton from 'src/components/contextActions/ReportUtilButton';
import ExportImportButton from 'src/components/contextActions/ExportImportButton';
import ScanCodeButton from 'src/components/contextActions/ScanCodeButton';
import NoticeButton from 'src/components/contextActions/NoticeButton';
import InboxButton from 'src/components/contextActions/InboxButton';
import SampleTaskNavigationElement from 'src/components/sampleTaskInbox/SampleTaskNavigationElement';

export default class ContextActions extends React.Component {
  render() {
    const { customClass } = this.props;
    return (
      <div className="d-flex flex-wrap align-items-center gap-2">
        <ButtonGroup className="d-flex align-items-center">
          <SplitElementButton />
          <CreateButton customClass={customClass} />
        </ButtonGroup>

        <ButtonGroup className="d-flex align-items-center">
          <ExportImportButton customClass={customClass} />
          <ReportUtilButton customClass={customClass} />
        </ButtonGroup>

        <ButtonToolbar className="d-flex flex-nowrap gap-2 align-items-center">
          <ScanCodeButton customClass={customClass} />
          <InboxButton />
          <SampleTaskNavigationElement />
          <NoticeButton />
        </ButtonToolbar>
      </div>
    );
  }
}

ContextActions.propTypes = {
  customClass: PropTypes.string,
};

ContextActions.defaultProps = {
  customClass: null,
};
