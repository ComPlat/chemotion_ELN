import React from 'react';
import _ from 'lodash';

import { Dropdown, MenuItem } from 'react-bootstrap';
import ElementActions from '../actions/ElementActions';
import UserStore from '../stores/UserStore';

const showReportContainer = () => {
  ElementActions.showReportContainer();
};

const showFormatContainer = () => {
  ElementActions.showFormatContainer();
  // TODO Aviator URL change
  /* Aviator.navigate(`/collection/${currentCollection.id}/sample/${id}`);*/
};

const showComputedPropsGraph = () => {
  ElementActions.showComputedPropsGraph();
};

const ReportUtilButton = () => {
  const data = UserStore.getState().profile.data || {};
  const enableComputedProps = _.get(data, 'computed_props.enable', false);

  const graphItem = enableComputedProps ? (
    <MenuItem onSelect={showComputedPropsGraph} title="Graph">
      Graph
    </MenuItem>
  ) : (
    <span />
  );

  return (
    <Dropdown id="format-dropdown">
      <Dropdown.Toggle className="btn-success">
        <i className="fa fa-file-text-o" style={{ marginRight: 4 }} />
        <i className="fa fa-pencil" />
      </Dropdown.Toggle>
      <Dropdown.Menu>
        <MenuItem onSelect={showReportContainer} title="Report">
          Report
        </MenuItem>
        <MenuItem divider />
        <MenuItem onSelect={showFormatContainer} title="Analyses Formatting">
          Format Analyses
        </MenuItem>
        {graphItem}
      </Dropdown.Menu>
    </Dropdown>
  );
};

export default ReportUtilButton;
