import React, { useState, useEffect } from 'react';
import { Button } from 'react-bootstrap';
import { Panel, PanelGroup, PanelResizeHandle } from 'react-resizable-panels';

import ElementsList from 'src/apps/mydb/elements/list/ElementsList';
import ElementDetails from 'src/apps/mydb/elements/details/ElementDetails';
import ElementStore from 'src/stores/alt/stores/ElementStore';

export default function Elements() {
  const [showDetailView, setShowDetailView] = useState(false);

  useEffect(() => {
    const onElementStoreChange = ({ currentElement }) => {
      setShowDetailView(currentElement !== null);
    }

    ElementStore.listen(onElementStoreChange);
    onElementStoreChange(ElementStore.getState());
    return () => ElementStore.unlisten(onElementStoreChange);
  }, []);

  return (
    <div className="flex-grow-1">
      <PanelGroup direction="horizontal">
        <Panel collapsible defaultSize={40} className="overflow-x-auto pt-3 px-3">
          <div className="h-100" style={{ minWidth: '600px' }}>
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
                <i className="fa fa-angle-double-left" />
              </Button>
            </PanelResizeHandle>
            <Panel defaultSize={60} className="overflow-x-auto pt-3 px-3">
              <div className="h-100" style={{ minWidth: '680px' }}>
                <ElementDetails />
              </div>
            </Panel>
          </>
        )}
      </PanelGroup>
    </div>
  );
}
