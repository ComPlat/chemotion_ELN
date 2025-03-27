import React from 'react';
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
    return (
      <div className="d-flex flex-wrap align-items-center gap-2">
        <ButtonGroup className="d-flex align-items-center">
          <SplitElementButton />
          <CreateButton />
        </ButtonGroup>

        <ButtonGroup className="d-flex align-items-center">
          <ExportImportButton />
          <ReportUtilButton />
        </ButtonGroup>

        <ButtonToolbar className="d-flex flex-nowrap gap-2 align-items-center">
          <ScanCodeButton />
          <InboxButton />
          <SampleTaskNavigationElement />
          <NoticeButton />
        </ButtonToolbar>
      </div>
    );
  }
}
