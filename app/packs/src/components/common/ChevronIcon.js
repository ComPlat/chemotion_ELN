import React, { forwardRef } from 'react';

// forwardRef is needed here so we can use ChevronIcon with react-bootstrap's
// OverlayTrigger. Components used with OverlayTriggers are passed a `ref` so
// the overlay can be properly positioned:
// https://react-bootstrap.netlify.app/docs/components/overlays#overlaytrigger
const ChevronIcon = forwardRef(({direction, className, color, ...props}, ref) => {
  const classes = ['fa', 'text-center', 'fa-chevron-' + direction];
  if (color) {
    classes.push('text-' + color);
  }
  if (className) {
    classes.push(className);
  }

  return (
    <i ref={ref} style={{ width: '1em' }} className={classes.join(' ')} {...props} />
  );
});

export default ChevronIcon;
