import React from 'react';
import PropTypes from 'prop-types';

const PermissionIcons = ({pl}) =>{
  return(pl>-1 ?
    <span>
      <i className="fa fa-newspaper-o"></i>
      &nbsp;{pl>0 ? <i className="fa fa-pencil-square-o"></i> : null}
      &nbsp;{pl>1 ? <i className="fa fa-share-alt"></i> : null}
      &nbsp;{pl>2 ? <i className="fa fa-trash"></i> : null}
      &nbsp;{pl>3 ? <i className="fa fa-download"></i> : null}
      &nbsp;{pl>4 ? <i className="fa fa-exchange"></i> : null}
    </span>
    : null
  )
}

PermissionIcons.propTypes = {
  pl: PropTypes.number.isRequired,
}

export default PermissionIcons;
