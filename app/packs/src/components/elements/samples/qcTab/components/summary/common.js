import React from 'react';
import { OverlayTrigger, Tooltip } from 'react-bootstrap';

const tpBadge = txt => (
  <Tooltip id={`tp${txt}`}>
    { txt }
  </Tooltip>
);

const BadgeNotAvailable = () => (
  <OverlayTrigger placement="top" overlay={tpBadge('Not Available!')}>
    <div className="qc-dark" />
  </OverlayTrigger>
);

const BadgeSuccess = () => (
  <OverlayTrigger placement="top" overlay={tpBadge('Pass')}>
    <div className="qc-success" />
  </OverlayTrigger>
);

const BadgeFail = () => (
  <OverlayTrigger placement="top" overlay={tpBadge('Fail')}>
    <div className="qc-failure" />
  </OverlayTrigger>
);

const BadgeDefault = () => (
  <div className="qc-default" />
);

export {
  BadgeNotAvailable,
  BadgeSuccess,
  BadgeFail,
  BadgeDefault,
};
