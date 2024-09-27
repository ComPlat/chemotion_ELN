import React from 'react';
import PropTypes from 'prop-types';
import {
  Badge,
  Button,
  Card,
  OverlayTrigger,
  Tooltip,
} from 'react-bootstrap';
import ReportActions from 'src/stores/alt/actions/ReportActions';
import LoadingActions from 'src/stores/alt/actions/LoadingActions';
import UIActions from 'src/stores/alt/actions/UIActions';
import { stopBubble } from 'src/utilities/DomHelper';

const clickDownloadReport = (e, archiveId, template) => {
  e.stopPropagation();
  ReportActions.downloadReport(archiveId, template);
};

const reportStatusBtn = (archive) => {
  const { downloadable, id, template } = archive;
  const onClickDownloadReport = (e) => clickDownloadReport(e, id, template);
  const downloadTP = <Tooltip id="download-docx">Download</Tooltip>;
  const processTP = (
    <Tooltip id="wait-processing">
      Processing the report. Please wait
    </Tooltip>
  );
  const downloadBtn = (
    <OverlayTrigger placement="top" overlay={downloadTP}>
      <Button variant="primary" size="sm" onClick={onClickDownloadReport}>
        <i className="fa fa-download" />
      </Button>
    </OverlayTrigger>
  );

  const processBtn = (
    <OverlayTrigger placement="top" overlay={processTP}>
      <Button variant="light" size="sm" onClick={stopBubble}>
        <i className="fa fa-clock-o" />
      </Button>
    </OverlayTrigger>
  );

  return downloadable ? downloadBtn : processBtn;
};

const clickToDelete = (e, archive) => {
  e.stopPropagation();
  if (confirm('Are you sure to delete this archive?')) {
    ReportActions.delete(archive);
  }
};

const deleteBtn = (archive) => {
  const onClickToDelete = (e) => clickToDelete(e, archive);
  const deleteTP = (
    <Tooltip id="delete-tp">
      Delete this archive.
    </Tooltip>
  );

  const btn = (
    <OverlayTrigger placement="top" overlay={deleteTP}>
      <Button variant="danger" size="sm" onClick={onClickToDelete}>
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
  const onClickToClone = (e) => clickToClone(e, archive);
  const cloneTP = (
    <Tooltip id="clone-tp">
      Load data from this report.
    </Tooltip>
  );

  const btn = (
    <OverlayTrigger placement="top" overlay={cloneTP}>
      <Button variant="warning" size="sm" onClick={onClickToClone}>
        <i className="fa fa-pencil" />
      </Button>
    </OverlayTrigger>
  );

  return btn;
};

const suiTooltip = () => (
  <Tooltip id="sui-tp">Supporting Information</Tooltip>
);

const suiLabel = () => (
  <OverlayTrigger placement="right" overlay={suiTooltip()}>
    <Badge bg="info">SI</Badge>
  </OverlayTrigger>
);

const suiStdRxnLabelTooltip = () => (
  <Tooltip id="sui-tp">Supporting Information - Standard Reaction</Tooltip>
);

const suiStdRxnLabel = () => (
  <OverlayTrigger placement="right" overlay={suiStdRxnLabelTooltip()}>
    <Badge bg="info">SI STD-RXN</Badge>
  </OverlayTrigger>
);

const spcTooltip = () => (
  <Tooltip id="spc-tp">SI Spectrum</Tooltip>
);

const spcLabel = () => (
  <OverlayTrigger placement="right" overlay={spcTooltip()}>
    <Badge bg="info">SI-SPC</Badge>
  </OverlayTrigger>
);

const rxlTooltip = () => (
  <Tooltip id="spc-tp">SI Reaction List Xlsx</Tooltip>
);

const rxlXlsxLabel = () => (
  <OverlayTrigger placement="right" overlay={rxlTooltip()}>
    <Badge bg="info">SI-XLSX</Badge>
  </OverlayTrigger>
);

const rxlCsvLabel = () => (
  <OverlayTrigger placement="right" overlay={rxlTooltip()}>
    <Badge bg="info">SI-CSV</Badge>
  </OverlayTrigger>
);

const rxlHtmlLabel = () => (
  <OverlayTrigger placement="right" overlay={rxlTooltip()}>
    <Badge bg="info">SI-HTML</Badge>
  </OverlayTrigger>
);

const templateLable = (archive) => {
  switch (archive.template.value) {
    case 'standard':
      return null;
    case 'spectrum':
      return spcLabel();
    case 'supporting_information':
      return suiLabel();
    case 'supporting_information_std_rxn':
      return suiStdRxnLabel();
    case 'rxn_list_xlsx':
      return rxlXlsxLabel();
    case 'rxn_list_csv':
      return rxlCsvLabel();
    case 'rxn_list_html':
      return rxlHtmlLabel();
    default:
      return null;
  }
};

const Archives = ({ archives }) => (
  <div className="d-flex flex-column gap-3">
    {archives.map((archive) => (
      <Card key={archive.id}>
        <Card.Header>
          <div className="d-flex justify-content-between">
            <div className="d-flex align-items-center gap-2">
              {archive.file_name}
              {archive.unread && (
                <Badge bg="warning">new</Badge>
              )}
              {templateLable(archive)}
            </div>
            <div className="d-flex gap-2">
              {cloneBtn(archive)}
              {reportStatusBtn(archive)}
              {deleteBtn(archive)}
            </div>
          </div>
        </Card.Header>
        <Card.Body>
          {archive.file_description
            ? <p>{archive.file_description}</p>
            : <p className="text-muted fst-italic">No file description</p>}
        </Card.Body>
      </Card>
    ))}
  </div>
);

Archives.propTypes = {
  archives: PropTypes.array.isRequired,
};

export default Archives;
