import React from 'react';
import { Button } from 'react-bootstrap';

const PanelHeader = ({title, processBtn, closeDetail}) => {
  return (
    <div>
      {title}
      <div className="button-right">
        <Button bsStyle="danger"
                bsSize="xsmall"
                className="g-marginLeft--10 button-right"
                onClick={closeDetail}>
          <i className="fa fa-times"></i>
        </Button>
        {processBtn()}
      </div>
    </div>
  );
}

export default PanelHeader;
