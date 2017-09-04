import React, {Component} from 'react'
import ReportActions from '../actions/ReportActions';
import { Table, Button, Label, PanelGroup, Panel, OverlayTrigger,
  Tooltip } from 'react-bootstrap';

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

  const siTooltip = <Tooltip>Supporting Information</Tooltip>;
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
        {downloadBtn(archive.downloadable, archive.id)}
      </div>
    </div>
  );
}

const downloadBtn = (downloadable, archive_id) => {
  return (
    downloadable
      ? <Button bsStyle="primary"
                bsSize="small"
                onClick={(e) => clickDownloadReport(e, archive_id)}>
          Download <i className="fa fa-download"></i>
        </Button>
      : <Button bsStyle="default"
                bsSize="small"
                disabled >
          Processing <i className="fa fa-clock-o"></i>
        </Button>
  );
}

const clickDownloadReport = (e, archive_id) => {
  e.stopPropagation();
  ReportActions.downloadReport(archive_id);
}

export default Archives;
