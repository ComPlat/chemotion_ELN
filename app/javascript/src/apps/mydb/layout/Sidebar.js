import React from 'react';
import PropTypes from 'prop-types';
import { Button } from 'react-bootstrap';
import classNames from 'classnames';

import ChemotionLogo from 'src/components/common/ChemotionLogo';
import CollectionTree from 'src/apps/mydb/collections/CollectionTree';
import CollectionManagementButton from 'src/apps/mydb/collections/CollectionManagementButton';

import InboxButton from "src/components/contextActions/InboxButton";
import SampleTaskNavigationElement from "src/components/sampleTaskInbox/SampleTaskNavigationElement";
import OpenCalendarButton from "src/components/calendar/OpenCalendarButton";
import NoticeButton from "src/components/contextActions/NoticeButton";

export default function Sidebar({ isCollapsed, toggleCollapse }) {
  return (
    <div className={"sidebar" + (isCollapsed ? " sidebar--collapsed" : "")} >
      <div className="sidebar-collapse-button-container">
        <Button
          onClick={toggleCollapse}
          className="sidebar-collapse-button"
        >
          <i className={"fa " + (isCollapsed ? "fa-angle-double-right" : "fa-angle-double-left")} />
        </Button>
      </div>
      <div className="h-100 d-flex flex-column">
        <a href="/mydb" title="Link to mydb index page">
          <ChemotionLogo collapsed={isCollapsed} />
        </a>
        <div className="d-flex flex-column flex-grow-1 overflow-y-auto h-0 my-3">
          {!isCollapsed && (
            <CollectionTree />
          )}
          <CollectionManagementButton />
        </div>
        <div className={classNames(
          'd-flex justify-content-center gap-3 py-4 border-top',
          { 'flex-column align-items-center': isCollapsed }
        )}>
          <InboxButton />
          <SampleTaskNavigationElement />
          <OpenCalendarButton />
          <NoticeButton />
        </div>
      </div>
    </div>
  );
}

Sidebar.propTypes = {
  isCollapsed: PropTypes.bool.isRequired,
  toggleCollapse: PropTypes.func.isRequired,
};
