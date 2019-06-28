import React from 'react';
import { Label, Tooltip, OverlayTrigger } from 'react-bootstrap';

const iconTp = margin => (
  <Tooltip id="ans-tp">
    max { margin } failure allowed.
  </Tooltip>
);

const iconByBool = result => (
  result
    ? <Label bsStyle="success" className="label-qc">Pass</Label>
    : <Label bsStyle="danger" className="label-qc">Fail</Label>
);

const iconByMargin = (result, margin = 0) => (
  <OverlayTrigger placement="right" overlay={iconTp(margin)}>
    { iconByBool(result) }
  </OverlayTrigger>
);

const iconTpMs = (
  <Tooltip id="ans-tp-ms">
    No matching molecular mass in the scan.
  </Tooltip>
);

const iconMs = result => (
  <OverlayTrigger placement="right" overlay={iconTpMs}>
    { iconByBool(result) }
  </OverlayTrigger>
);

const statusTp = txt => <Tooltip id="status-tp">{ txt }</Tooltip>;

const iconStatus = (status) => {
  switch (status) {
    case 'accept':
      return (
        <OverlayTrigger placement="top" overlay={statusTp(status)}>
          <i className="fa fa-check-circle-o" style={{ color: '#4caf50' }} />
        </OverlayTrigger>
      );
    case 'warning':
      return (
        <OverlayTrigger placement="top" overlay={statusTp(status)}>
          <i className="fa fa-exclamation-circle" style={{ color: '#ffc107' }} />
        </OverlayTrigger>
      );
    case 'reject':
      return (
        <OverlayTrigger placement="top" overlay={statusTp(status)}>
          <i className="fa fa-times-circle-o" style={{ color: '#e91e63' }} />
        </OverlayTrigger>
      );
    case 'missing':
      return (
        <OverlayTrigger placement="top" overlay={statusTp(status)}>
          <i className="fa fa-question-circle-o" style={{ color: '#5d4037' }} />
        </OverlayTrigger>
      );
    case 'unknown':
      return (
        <OverlayTrigger placement="top" overlay={statusTp(status)}>
          <i className="fa fa-question-circle-o" style={{ color: '#5d4037' }} />
        </OverlayTrigger>
      );
    default:
      return null;
  }
};

export {
  iconByMargin,
  iconByBool,
  iconMs,
  iconStatus,
};
