import React from 'react';
import PropTypes from 'prop-types';

const PermissionIcons = ({ pl }) => {
  return (pl > -1)
    ? (
      <>
        <i className="fa fa-newspaper-o" />
        {pl > 0 && <i className="fa fa-pencil-square-o" />}
        {pl > 1 && <i className="fa fa-share-alt" />}
        {pl > 2 && <i className="fa fa-trash" />}
        {pl > 3 && <i className="fa fa-download" />}
        {pl > 4 && <i className="fa fa-exchange" />}
      </>
    )
    : null;
};

PermissionIcons.propTypes = {
  pl: PropTypes.number.isRequired,
};

export default PermissionIcons;
