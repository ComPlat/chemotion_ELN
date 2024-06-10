import React from 'react';
import PropTypes from 'prop-types';
import { Button } from 'react-bootstrap';
import PredictionActions from 'src/stores/alt/actions/PredictionActions';
import UIActions from 'src/stores/alt/actions/UIActions';
import DetailActions from 'src/stores/alt/actions/DetailActions';
import LoadingActions from 'src/stores/alt/actions/LoadingActions';

const clickToClose = (el) => {
  DetailActions.close(el);
};

const CloseBtn = ({ el }) => {
  const onClickToClose = () => clickToClose(el);

  return (
    <Button
      variant="danger"
      size="sm"
      onClick={onClickToClose}
    >
      <i className="fa fa-times" />
    </Button>
  );
};

const clickToReset = () => {
  PredictionActions.reset();
  UIActions.uncheckWholeSelection.defer();
};

const ResetBtn = () => (
  <Button
    variant="info"
    size="sm"
    onClick={clickToReset}
  >
    <span><i className="fa fa-eraser" /> Reset</span>
  </Button>
);

const PredictBtn = ({ inputEls, template }) => {
  const onClick = () => {
    LoadingActions.start.defer();
    PredictionActions.infer.defer(inputEls, template);
  };
  const disableBtn = inputEls.length === 0;

  return (
    <Button
      variant="primary"
      size="sm"
      disabled={disableBtn}
      onClick={onClick}
    >
      <span><i className="fa fa-file-text-o" /> Predict</span>
    </Button>
  );
};

PredictBtn.propTypes = {
  inputEls: PropTypes.array.isRequired, // eslint-disable-line react/forbid-prop-types
};

export { CloseBtn, ResetBtn, PredictBtn };
