import React from 'react';
import _ from 'lodash';
import PropTypes from 'prop-types';
import { Dropdown, MenuItem } from 'react-bootstrap';

import ElementActions from '../actions/ElementActions';
import UserStore from '../stores/UserStore';
import MatrixCheck from '../common/MatrixCheck';

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

const ReportUtilButton = ({ customClass  }) => {
  const currentUser = (UserStore.getState() && UserStore.getState().currentUser) || {};
  const enableComputedProps = MatrixCheck(currentUser.matrix, 'computedProp');
  const enableReactionPredict = MatrixCheck(currentUser.matrix, 'reactionPrediction');
  const graphItem = enableComputedProps ? (
    <MenuItem onSelect={showComputedPropsGraph} title="Graph">
      Graph
    </MenuItem>
  ) : (
    <span />
  );

  const predBtn = enableReactionPredict ? (
    <MenuItem onSelect={showPredictionContainer} title="Predict">
      Synthesis Prediction
    </MenuItem>
  ) : (<span />);

  return (
    <Dropdown id="format-dropdown">
      <Dropdown.Toggle className={customClass || 'btn-success'}>
        <i className="fa fa-file-text-o" style={{ marginRight: 4 }} />
        <i className="fa fa-pencil" style={{ marginRight: 4 }} />
        <i className="fa fa-percent" />
      </Dropdown.Toggle>
      <Dropdown.Menu>
        <MenuItem onSelect={showReportContainer} title="Report">
          Report
        </MenuItem>
        <MenuItem divider />
        <MenuItem onSelect={showFormatContainer} title="Analyses Formatting">
          Format Analyses
        </MenuItem>
        <MenuItem onSelect={ElementActions.showLiteratureDetail} title="Reference Manager">
          Literature
        </MenuItem>
        {graphItem}
        <MenuItem divider />
        {predBtn}
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
