import React from 'react';
import PropTypes from 'prop-types';
import { Button } from 'react-bootstrap';
import classNames from 'classnames';

import ChemotionLogo from 'src/components/common/ChemotionLogo';
import CollectionTree from 'src/apps/mydb/collections/CollectionTree';

import InboxButton from "src/components/contextActions/InboxButton";
import SampleTaskNavigationElement from "src/components/sampleTaskInbox/SampleTaskNavigationElement";
import OpenCalendarButton from "src/components/calendar/OpenCalendarButton";
import NoticeButton from "src/components/contextActions/NoticeButton";

export default function Sidebar({ isCollapsed, toggleSidebar, expandSidebar }) {
  return (
    <div className={"sidebar" + (isCollapsed ? " sidebar--collapsed" : "")} >
      <div className="sidebar-collapse-button-container">
        <Button
          onClick={toggleSidebar}
          className="sidebar-collapse-button"
        >
          <i className={"fa " + (isCollapsed ? "fa-angle-double-right" : "fa-angle-double-left")} />
        </Button>
      </div>
      <div className="h-100 d-flex flex-column gap-3">
        <a href="/mydb" title="Link to mydb index page">
          <ChemotionLogo collapsed={isCollapsed} />
        </a>
        <div className="flex-grow-1 h-0">
          <CollectionTree isCollapsed={isCollapsed} expandSidebar={expandSidebar} />
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
  toggleSidebar: PropTypes.func.isRequired,
  expandSidebar: PropTypes.func.isRequired,
};
