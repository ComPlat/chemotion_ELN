import React, { useState, useEffect } from 'react';
import classnames from 'classnames';

import UIStore from 'src/stores/alt/stores/UIStore';
import UIActions from 'src/stores/alt/actions/UIActions';

import ChemotionLogo from 'src/components/common/ChemotionLogo';
import CollectionTree from 'src/apps/mydb/collections/CollectionTree';

import InboxButton from 'src/components/contextActions/InboxButton';
import SampleTaskSidebarButton from 'src/components/sampleTaskInbox/SampleTaskSidebarButton';
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
    <div className={classnames('sidebar', { 'sidebar--collapsed': isCollapsed })}>
      <div className="sidebar-content">
        <a href="/mydb" title="Link to mydb index page" className="sidebar-logo">
          <ChemotionLogo collapsed={isCollapsed} />
        </a>
        <div className="flex-grow-1 h-0">
          <CollectionTree
            isCollapsed={isCollapsed}
            expandSidebar={UIActions.expandSidebar}
          />
        </div>
        <div className={classnames(
          'sidebar-button-frame justify-content-center mx-auto',
          { 'flex-column': isCollapsed }
        )}
        >
          <InboxButton isCollapsed={isCollapsed} />
          <SampleTaskSidebarButton isCollapsed={isCollapsed} />
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
