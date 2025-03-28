import React from 'react';

const Sheet = ({variant, className, children, ...props}) => {
  let composedClassName = ['sheet', className].join(' ');
  if (variant) {
    composedClassName += ' sheet-' + variant;
  }
  return (
    <div
      className={composedClassName}
      {...props}
    >
      {children}
    </div>
  );
}

export default Sheet;
