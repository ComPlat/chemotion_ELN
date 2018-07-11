import React from 'react';
import { ListGroup } from 'react-bootstrap';
import PropTypes from 'prop-types';

const ChildOverlay = ({ dataList, overlayAttributes }) => {
  return (
    <div {...overlayAttributes}>
      <ListGroup>
        {dataList}
      </ListGroup>
    </div>
  );
};

ChildOverlay.propTypes = {
  dataList: PropTypes.object,
  overlayAttributes: PropTypes.object
};

export default ChildOverlay;
