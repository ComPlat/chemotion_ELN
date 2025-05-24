
import React from 'react';
import { Button } from 'react-bootstrap';
import ForwardActions from 'src/stores/alt/actions/ForwardActions';
import UIActions from 'src/stores/alt/actions/UIActions';
import DetailActions from 'src/stores/alt/actions/DetailActions';

const clickToClose = (el) => {
  DetailActions.close(el);
};

const CloseBtn = ({ el }) => {
  const onClickToClose = () => clickToClose(el);

  return (
    <Button
      bsStyle="danger"
      bsSize="xsmall"
      className="button-right"
      onClick={onClickToClose}
    >
      <i className="fa fa-times" />
    </Button>
  );
};

const clickToReset = () => {
  ForwardActions.reset();
  UIActions.uncheckWholeSelection.defer();
};

const ResetBtn = () => (
  <Button
    bsStyle="info"
    bsSize="xsmall"
    className="button-right"
    onClick={clickToReset}
  >
    <span><i className="fa fa-eraser" /> Reset</span>
  </Button>
);


export { CloseBtn, ResetBtn };
