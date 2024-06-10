import React from 'react';

const PanelHeader = ({ title, btns }) => {
  return (
    <div>
      {title}
      <div className="d-flex">
        {btns}
      </div>
    </div>
  );
};

export default PanelHeader;
