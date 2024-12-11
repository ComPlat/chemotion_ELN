import React from 'react';

export default function ScrollContainer({ children }) {
  return (
    <div className="d-flex flex-column h-100">
      <div className="flex-grow-1 overflow-y-auto h-0">
        {children}
      </div>
    </div>
  );
}
