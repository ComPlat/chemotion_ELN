import React from 'react';
import PropTypes from 'prop-types';
import { OverlayTrigger, Popover } from 'react-bootstrap';
import Reaction from 'src/models/Reaction';

const HiddenStepValues = ({ reaction, label, value }) => {
  if (!reaction.hasHiddenSteps()) return null;

  const steps = reaction.stepsView();
  const popover = (
    <Popover id={`hidden-step-values-${label}`}>
      <Popover.Header>{`${label} per step`}</Popover.Header>
      <Popover.Body>
        {steps.map((step, index) => <div key={step.id}>{`Step ${index + 1}: ${value(step) || '—'}`}</div>)}
      </Popover.Body>
    </Popover>
  );

  return (
    <span onClick={(event) => event.preventDefault()} role="presentation">
      <OverlayTrigger trigger="click" rootClose placement="top" overlay={popover}>
        <i className="fa fa-info-circle ms-1" role="button" tabIndex={0} aria-label={`${label} per step`} />
      </OverlayTrigger>
    </span>
  );
};

HiddenStepValues.propTypes = {
  reaction: PropTypes.instanceOf(Reaction).isRequired,
  label: PropTypes.string.isRequired,
  value: PropTypes.func.isRequired,
};

export default HiddenStepValues;
