import React from 'react';
import { Dropdown, MenuItem } from 'react-bootstrap';
import ElementActions from '../actions/ElementActions';

const showReportContainer = () => {
  ElementActions.showReportContainer();
};

const showFormatContainer = () => {
  ElementActions.showFormatContainer();
  // TODO Aviator URL change
  /* Aviator.navigate(`/collection/${currentCollection.id}/sample/${id}`);*/
};

const ReportUtilButton = () => (
  <Dropdown id='format-dropdown'>
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
    </Dropdown.Menu>
  </Dropdown>
);

export default ReportUtilButton;
