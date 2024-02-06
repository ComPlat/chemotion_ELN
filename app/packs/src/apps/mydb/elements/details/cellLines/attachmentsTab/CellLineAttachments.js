import React from 'react';
import PropTypes from 'prop-types';

export default class CellLineAttachments extends React.Component {

  render() {    
    return (
      <div> Im Wellplate</div>
    );
  }
}

CellLineAttachments.propTypes = {
  cellLineItem: PropTypes.shape({
    attachments: PropTypes.arrayOf(PropTypes.shape({
    id: PropTypes.oneOfType([
      PropTypes.string,
      PropTypes.number
    ]).isRequired,
    aasm_state: PropTypes.string.isRequired,
    content_type: PropTypes.string.isRequired,
    filename: PropTypes.string.isRequired,
    filesize: PropTypes.number.isRequired,
    identifier: PropTypes.oneOfType([
      PropTypes.string,
      PropTypes.number
    ]).isRequired,
    thumb: PropTypes.bool.isRequired
  }))
  }).isRequired,
  readOnly: PropTypes.bool.isRequired
};