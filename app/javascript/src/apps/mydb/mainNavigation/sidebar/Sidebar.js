import React, { useState, useEffect } from 'react';
import classnames from 'classnames';

import UIStore from 'src/stores/alt/stores/UIStore';
import UIActions from 'src/stores/alt/actions/UIActions';

import ChemotionLogo from 'src/components/common/ChemotionLogo';
import CollectionTree from 'src/apps/mydb/collections/CollectionTree';
import PanelCollapseButton from 'src/apps/mydb/mainNavigation/PanelCollapseButton';

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
        <div className="flex-grow-1 h-0 pb-4">
          <CollectionTree isCollapsed={isCollapsed} />
        </div>
        <div className={classnames(
          'sidebar-button-frame justify-content-center mx-auto',
          { 'flex-column': isCollapsed }
        )}
        >
          <a href="/mydb" title="Link to mydb index page" className="sidebar-logo">
            <ChemotionLogo collapsed={isCollapsed} />
          </a>
        </div>
      </div>
      <div className="sidebar-collapse-button-container">
        <PanelCollapseButton onClick={UIActions.toggleSidebar} isCollapsed={isCollapsed} />
      </div>
    </div>
  );
}
