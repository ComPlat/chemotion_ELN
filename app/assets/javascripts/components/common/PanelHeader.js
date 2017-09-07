import React from 'react';

const PanelHeader = ({ title, btns }) => {
  return (
    <div>
      {title}
      <div className="button-right">
        {btns}
      </div>
    </div>
  );
};

export default PanelHeader;
