import React from 'react';
import PropTypes from 'prop-types';
import { Button } from 'react-bootstrap';
import classNames from 'classnames';

import NavHead from 'src/components/navigation/NavHead';
import CollectionTree from 'src/apps/mydb/collections/CollectionTree';
import CollectionManagementButton from 'src/apps/mydb/collections/CollectionManagementButton';

import InboxButton from 'src/components/contextActions/InboxButton';
import SampleTaskNavigationElement from 'src/components/sampleTaskInbox/SampleTaskNavigationElement';
import OpenCalendarButton from 'src/components/calendar/OpenCalendarButton';
import NoticeButton from 'src/components/contextActions/NoticeButton';

export default function Sidebar({ isCollapsed, toggleCollapse }) {
  return (
    <>
      <div className="sidebar-collapse-button-container">
        <Button
          onClick={toggleCollapse}
          variant="light"
          className="sidebar-collapse-button"
        >
          <i className="fa fa-exchange" />
        </Button>
      </div>
      <div className="h-100 d-flex flex-column">
        <div className="d-flex flex-column flex-grow-1 overflow-y-auto h-0">
          <div className="d-flex justify-content-center py-3">
            <NavHead />
          </div>
          {!isCollapsed && (
            <CollectionTree />
          )}
          <CollectionManagementButton />
        </div>
        <div className={classNames(
          'd-flex justify-content-center gap-3 py-4',
          { 'flex-column align-items-center': isCollapsed }
        )}>
          <InboxButton />
          <SampleTaskNavigationElement />
          <OpenCalendarButton />
          <NoticeButton />
        </div>
      </div>
    </>
  );
}

Sidebar.propTypes = {
  isCollapsed: PropTypes.bool.isRequired,
  toggleCollapse: PropTypes.func.isRequired,
};
