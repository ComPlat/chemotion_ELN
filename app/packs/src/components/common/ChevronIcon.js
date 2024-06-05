import React from 'react';

const ChevronIcon = ({direction, ...props}) => {
  return (
    <i className={`fa fa-chevron-${direction} ${props.className || ''}`} {...props} />
  );
}

export default ChevronIcon;