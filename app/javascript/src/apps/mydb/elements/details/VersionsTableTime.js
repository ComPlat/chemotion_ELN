import React from 'react';
import PropTypes from 'prop-types';
import { OverlayTrigger, Tooltip } from 'react-bootstrap';
import moment from 'moment';

function VersionsTableTime(props) {
  const { dateTime } = props;

  const formattedTime = () => moment(dateTime).format('YYYY-MM-DD HH:mm:ss');

  const timeFromNow = () => moment(dateTime).fromNow();

  const renderTooltip = () => (
    <Tooltip id="datetime">
      {timeFromNow()}
    </Tooltip>
  );

  return (
    <OverlayTrigger
      placement="top"
      overlay={renderTooltip(dateTime)}
    >
      <span>{formattedTime()}</span>
    </OverlayTrigger>
  );
}

VersionsTableTime.propTypes = {
  dateTime: PropTypes.instanceOf(Date).isRequired,
};

export default VersionsTableTime;
