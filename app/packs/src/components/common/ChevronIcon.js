import React from 'react';

const ChevronIcon = ({direction, className, color, ...props}) => {
  const classes = ['fa', 'fa-chevron-' + direction];
  if (color) {
    classes.push('text-' + color);
  }
  if (className) {
    classes.push(className);
  }

  return (
    <i className={classes.join(' ')} {...props} />
  );
}

export default ChevronIcon;
