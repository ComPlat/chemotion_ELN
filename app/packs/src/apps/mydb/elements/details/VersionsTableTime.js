import React from 'react';
import PropTypes from 'prop-types';
import { OverlayTrigger, Tooltip } from 'react-bootstrap';
import moment from 'moment';

function VersionsTableTime(props) {
  const { dateTime } = props;

  const renderTooltip = () => (
    <Tooltip id="datetime">
      {moment(dateTime).format('YYYY-MM-DD HH:mm')}
    </Tooltip>
  );

  return (
    <OverlayTrigger
      placement="top"
      overlay={renderTooltip(dateTime)}
    >
      <span>{moment(dateTime).fromNow()}</span>
    </OverlayTrigger>
  );
}

VersionsTableTime.propTypes = {
  dateTime: PropTypes.instanceOf(Date).isRequired,
};

export default VersionsTableTime;
