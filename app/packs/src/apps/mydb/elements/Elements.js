import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Button } from 'react-bootstrap';
import { Panel, PanelGroup, PanelResizeHandle } from 'react-resizable-panels';

import ElementsList from 'src/apps/mydb/elements/list/ElementsList';
import ElementDetails from 'src/apps/mydb/elements/details/ElementDetails';
import ElementStore from 'src/stores/alt/stores/ElementStore';

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
    <div className="flex-grow-1">
      <PanelGroup
        autoSaveId="elements-panel"
        direction="horizontal"
        ref={panelRef}
        onLayout={onLayout}
      >
        <Panel collapsible defaultSize={defaultLayout[0]} className="overflow-x-auto">
          <div className="h-100 mt-3 mx-3" style={{ minWidth: '600px' }}>
            <ElementsList overview={!showDetailView} />
          </div>
        </Panel>

        {showDetailView && (
          <>
            <PanelResizeHandle className="panel-resize-handle">
              <Button
                className="panel-collapse-button"
                onClick={toggleListView}
              >
                <i className={`fa fa-angle-double-${isCollapsed ? 'right' : 'left'}`} />
              </Button>
            </PanelResizeHandle>
            <Panel defaultSize={defaultLayout[1]} className="overflow-x-auto">
              <div className="h-100 mt-3 mx-3" style={{ minWidth: '680px' }}>
                <ElementDetails />
              </div>
            </Panel>
          </>
        )}
      </PanelGroup>
    </div>
  );
}
