import React from 'react';
import PropTypes from 'prop-types';
import { Dropdown, ButtonGroup } from 'react-bootstrap';

import ElementActions from 'src/stores/alt/actions/ElementActions';
import UserStore from 'src/stores/alt/stores/UserStore';
import MatrixCheck from 'src/components/common/MatrixCheck';

const showReportContainer = () => {
  ElementActions.showReportContainer();
};

const showFormatContainer = () => {
  ElementActions.showFormatContainer();
};

const showPredictionContainer = () => {
  ElementActions.showPredictionContainer();
};

const showComputedPropsGraph = () => {
  ElementActions.showComputedPropsGraph();
};

const showComputedPropsTasks = () => {
  ElementActions.showComputedPropsTasks();
};

const ReportUtilButton = ({ customClass }) => {
  const currentUser = (UserStore.getState() && UserStore.getState().currentUser) || {};
  const enableComputedProps = MatrixCheck(currentUser.matrix, 'computedProp');
  const enableReactionPredict = MatrixCheck(currentUser.matrix, 'reactionPrediction');

  let graph = <span />;
  let task = <span />;
  if (enableComputedProps) {
    graph = (
      <Dropdown.Item onClick={showComputedPropsGraph} title="Graph">
        Computed Props Graph
      </Dropdown.Item>
    );
    task = (
      <Dropdown.Item onClick={showComputedPropsTasks} title="Graph">
        Computed Props Tasks
      </Dropdown.Item>
    );
  }

  let predDiv = <span />;
  let divider = <span />;
  if (enableReactionPredict) {
    divider = <Dropdown.Divider />;
    predDiv = (
      <Dropdown.Item onClick={showPredictionContainer} title="Predict">
        Synthesis Prediction
      </Dropdown.Item>
    );
  }

  return (
    <Dropdown as={ButtonGroup} id="format-dropdown">
      <Dropdown.Toggle className={customClass} variant="success">
        <i className="fa fa-file-text-o" style={{ marginRight: 4 }} />
        <i className="fa fa-pencil" style={{ marginRight: 4 }} />
        <i className="fa fa-percent" />
      </Dropdown.Toggle>
      <Dropdown.Menu>
        <Dropdown.Item onClick={showReportContainer} title="Report">
          Report
        </Dropdown.Item>
        <Dropdown.Divider />
        <Dropdown.Item onClick={showFormatContainer} title="Analyses Formatting">
          Format Analyses
        </Dropdown.Item>
        <Dropdown.Item onClick={ElementActions.showLiteratureDetail} title="Reference Manager">
          Reference Manager
        </Dropdown.Item>
        {graph}
        {task}
        {divider}
        {predDiv}
      </Dropdown.Menu>
    </Dropdown>
  );
};

ReportUtilButton.propTypes = {
  customClass: PropTypes.string,
};

ReportUtilButton.defaultProps = {
  customClass: null,
};

export default ReportUtilButton;
