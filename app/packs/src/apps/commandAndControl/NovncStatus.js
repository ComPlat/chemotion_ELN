import React from 'react';

export const ConnectedBtn = () => (
  <span>
    <i
      className="fa fa-check-circle-o"
      aria-hidden="true"
      style={{ color: '#90ee90', float: 'right', fontSize: '20px' }}
    />
  </span>
);

export const DisconnectedBtn = () => (
  <span>
    <i
      className="fa fa-times-circle-o"
      aria-hidden="true"
      style={{ color: 'red', float: 'right', fontSize: '20px' }}
    />
  </span>
);
