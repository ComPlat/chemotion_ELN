import React, {Component} from 'react'
import ReportActions from '../actions/ReportActions';
import LoadingActions from '../actions/LoadingActions';
import UIActions from '../actions/UIActions';
import { Table, Button, Label, PanelGroup, Panel, OverlayTrigger,
  Tooltip } from 'react-bootstrap';
import { stopBubble } from '../utils/DomHelper';

const Archives = ({archives}) => {
  const content = archives.map( (archive, index) => {
    return (
      <Panel eventKey={index}
             key={index}
             header={title(archive)} >
        {fileDescription(archive)}
      </Panel>
    );
  })

  return (
    <PanelGroup accordion>
      {content}
    </PanelGroup>
  )
}

const fileDescription = (archive) => {
  return (
    archive.file_description
      ? <p>{archive.file_description}</p>
      : <p className="text-comment">No file description</p>
  );
}

const title = (archive) => {
  const newLabel = archive.unread
    ? <Label bsStyle="warning">new</Label>
    : null;

  const siTooltip = <Tooltip id="si-tp">Supporting Information</Tooltip>;
  const supportingInfoLabel = archive.template === 'supporting_information'
    ? (
      <OverlayTrigger placement="right" overlay={siTooltip}>
        <Label bsStyle="info">SI</Label>
      </OverlayTrigger>
    )
    : null;

  return (
    <div style={{width: '100%', lineHeight: '30px'}}>
      {archive.file_name} {newLabel} {supportingInfoLabel}
      <div className="button-right">
        {cloneBtn(archive)}
        <span>&nbsp;</span>
        {downloadStatusBtn(archive.downloadable, archive.id)}
        <span>&nbsp;</span>
        {deleteBtn(archive)}
      </div>
    </div>
  );
};

const clickDownloadReport = (e, archiveId) => {
  e.stopPropagation();
  ReportActions.downloadReport(archiveId);
};

const downloadStatusBtn = (downloadable, archiveId) => {
  const onClickDownloadReport = e => clickDownloadReport(e, archiveId);
  const downloadTP = <Tooltip id="download-docx">Download docx</Tooltip>;
  const processTP = (
    <Tooltip  id="wait-processing">
      Processing the report. Please wait
    </Tooltip>
  );
  const downloadBtn = (
    <OverlayTrigger placement="top" overlay={downloadTP}>
      <Button bsStyle="primary" bsSize="small" onClick={onClickDownloadReport}>
        <i className="fa fa-download" />
      </Button>
    </OverlayTrigger>
  );

  const processBtn = (
    <OverlayTrigger placement="top" overlay={processTP}>
      <Button bsStyle="default" bsSize="small" onClick={stopBubble}>
        <i className="fa fa-clock-o" />
      </Button>
    </OverlayTrigger>
  );

  return downloadable ? downloadBtn : processBtn;
};

const clickToDelete = (e, archive) => {
  e.stopPropagation();
  if(confirm('Are you sure to delete this archive?')) {
    ReportActions.delete(archive);
  }
};

const deleteBtn = (archive) => {
  const onClickToDelete = e => clickToDelete(e, archive);
  const deleteTP = (
    <Tooltip id="delete-tp">
      Delete this archive.
    </Tooltip>
  );

  const btn = (
    <OverlayTrigger placement="top" overlay={deleteTP}>
      <Button bsStyle="danger" bsSize="small" onClick={onClickToDelete}>
        <i className="fa fa-times" />
      </Button>
    </OverlayTrigger>
  );

  return btn;
};

const clickToClone = (e, archive) => {
  e.stopPropagation();
  LoadingActions.start();
  ReportActions.clone.defer(archive);
  UIActions.uncheckWholeSelection.defer();
};

const cloneBtn = (archive) => {
  const onClickToClone = e => clickToClone(e, archive);
  const cloneTP = (
    <Tooltip id="clone-tp">
      Load date from this report.
    </Tooltip>
  );

  const btn = (
    <OverlayTrigger placement="top" overlay={cloneTP}>
      <Button bsStyle="warning" bsSize="small" onClick={onClickToClone}>
        <i className="fa fa-pencil" />
      </Button>
    </OverlayTrigger>
  );

  return btn;
};

export default Archives;
