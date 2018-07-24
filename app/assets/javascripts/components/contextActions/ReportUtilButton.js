import React from 'react';
import _ from 'lodash';
import PropTypes from 'prop-types';
import { Dropdown, MenuItem } from 'react-bootstrap';

import ElementActions from '../actions/ElementActions';
import UserStore from '../stores/UserStore';

const showReportContainer = () => {
  ElementActions.showReportContainer();
};

const showFormatContainer = () => {
  ElementActions.showFormatContainer();
};



const showComputedPropsGraph = () => {
  ElementActions.showComputedPropsGraph();
};

const ReportUtilButton = ({ customClass  }) => {
  const userState = UserStore.getState();
  const profileData = _.get(userState, 'profile.data', {});
  const enableComputedProps = _.get(profileData, 'computed_props.enable', false);

  const graphItem = enableComputedProps ? (
    <MenuItem onSelect={showComputedPropsGraph} title="Graph">
      Graph
    </MenuItem>
  ) : (
    <span />
  );


  return (
    <Dropdown id="format-dropdown">
      <Dropdown.Toggle className={customClass || 'btn-success'}>
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
        <MenuItem onSelect={ElementActions.showLiteratureDetail} title="Reference Manager">
          Literature
        </MenuItem>
        {graphItem}
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
