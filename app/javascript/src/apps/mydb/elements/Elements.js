import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Panel, PanelGroup, PanelResizeHandle } from 'react-resizable-panels';

import ElementsList from 'src/apps/mydb/elements/list/ElementsList';
import ElementDetails from 'src/apps/mydb/elements/details/ElementDetails';
import ElementStore from 'src/stores/alt/stores/ElementStore';
import PanelCollapseButton from 'src/apps/mydb/layout/PanelCollapseButton';

const defaultLayout = [40, 60];
const isLayoutCollapsed = (layout) => layout[0] === 0;

export default function Elements() {
  const [showDetailView, setShowDetailView] = useState(false);
  const [isCollapsed, setCollapsed] = useState(true);
  const [returnLayout, setReturnLayout] = useState(null);
  const panelRef = useRef(null);

  useEffect(() => {
    const onElementStoreChange = ({ currentElement }) => {
      setShowDetailView(currentElement !== null);
    }

    ElementStore.listen(onElementStoreChange);
    onElementStoreChange(ElementStore.getState());
    return () => ElementStore.unlisten(onElementStoreChange);
  }, []);

  const toggleListView = useCallback(() => {
    if (!panelRef.current) return;
    const panel = panelRef.current;

    const layout = panel.getLayout();
    if (isLayoutCollapsed(layout)) {
      if (returnLayout) {
        panel.setLayout(returnLayout);
        setReturnLayout(null);
      } else {
        panel.setLayout(defaultLayout);
      }
    } else {
      setReturnLayout(layout);
      panel.setLayout([0, 100]);
    }
  }, [returnLayout]);

  const onLayout = useCallback((layout) => {
    setCollapsed(isLayoutCollapsed(layout));
  }, []);

  return (
    <PanelGroup
      autoSaveId="elements-panel"
      direction="horizontal"
      ref={panelRef}
      onLayout={onLayout}
    >
      <Panel
        id="elements-list-view"
        order={1}
        collapsible
        defaultSize={showDetailView ? defaultLayout[0] : 100}
        className="w-0"
      >
        <div className="h-100 pt-3 px-3 overflow-x-auto">
          <div className="h-100" style={{ minWidth: '600px' }}>
            <ElementsList overview={!showDetailView} />
          </div>
        </div>
      </Panel>

      {showDetailView && (
        <>
          <PanelResizeHandle className="panel-resize-handle">
            <PanelCollapseButton isCollapsed={isCollapsed} onClick={toggleListView} />
          </PanelResizeHandle>
          <Panel
            id="elements-detail-view"
            order={2}
            defaultSize={defaultLayout[1]}
            className="w-0"
          >
            <div className="h-100 pt-3 px-3 overflow-x-auto">
              <div className="h-100" style={{ minWidth: '680px' }}>
                <ElementDetails />
              </div>
            </div>
          </Panel>
        </>
      )}
    </PanelGroup>
  );
}
