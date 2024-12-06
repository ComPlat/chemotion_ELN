import React, { useState, useEffect } from 'react';
import classNames from 'classnames';

import UIStore from 'src/stores/alt/stores/UIStore';
import UIActions from 'src/stores/alt/actions/UIActions';

import ChemotionLogo from 'src/components/common/ChemotionLogo';
import CollectionTree from 'src/apps/mydb/collections/CollectionTree';

import InboxButton from 'src/components/contextActions/InboxButton';
import SampleTaskNavigationElement from 'src/components/sampleTaskInbox/SampleTaskNavigationElement';
import OpenCalendarButton from 'src/components/calendar/OpenCalendarButton';
import NoticeButton from 'src/components/contextActions/NoticeButton';
import PanelCollapseButton from 'src/apps/mydb/layout/PanelCollapseButton';

export default function Sidebar() {
  const [isCollapsed, setIsCollapsed] = useState(false);
  useEffect(() => {
    const onUiStoreChange = ({ isSidebarCollapsed }) => setIsCollapsed(isSidebarCollapsed);
    UIStore.listen(onUiStoreChange);
    onUiStoreChange(UIStore.getState());
    return () => UIStore.unlisten(onUiStoreChange);
  }, []);

  return (
    <div className={"sidebar" + (isCollapsed ? " sidebar--collapsed" : "")} >
      <div className="sidebar-content">
        <a href="/mydb" title="Link to mydb index page" className='sidebar-logo'>
          <ChemotionLogo collapsed={isCollapsed} />
        </a>
        <div className="flex-grow-1 h-0">
          <CollectionTree
            isCollapsed={isCollapsed}
            expandSidebar={UIActions.expandSidebar}
          />
        </div>
        <div className={classNames(
          'sidebar-button-frame justify-content-center',
          { 'flex-column': isCollapsed }
        )}>
          <InboxButton isCollapsed={isCollapsed} />
          <SampleTaskNavigationElement isCollapsed={isCollapsed} />
          <OpenCalendarButton isCollapsed={isCollapsed} />
          <NoticeButton isCollapsed={isCollapsed} />
        </div>
      </div>
      <div className="sidebar-collapse-button-container">
        <PanelCollapseButton onClick={UIActions.toggleSidebar} isCollapsed={isCollapsed} />
      </div>
    </div>
  );
}
