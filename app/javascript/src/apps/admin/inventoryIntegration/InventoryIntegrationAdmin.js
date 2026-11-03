import React, { useCallback, useContext, useEffect, useState } from 'react';
import { Alert, Tab, Tabs } from 'react-bootstrap';
import InventoryIntegrationFetcher from 'src/fetchers/InventoryIntegrationFetcher';
import { StoreContext } from 'src/stores/mobx/RootStore';
import InventoriesTab from 'src/apps/admin/inventoryIntegration/InventoriesTab';
import ConnectionsTab from 'src/apps/admin/inventoryIntegration/ConnectionsTab';

// Admin page of the external inventory integration. IT turns it on in config/inventory_integration.yml.
const InventoryIntegrationAdmin = () => {
  const { notifications } = useContext(StoreContext);
  const [status, setStatus] = useState(null);
  const [inventories, setInventories] = useState([]);
  const [connections, setConnections] = useState([]);

  const notify = useCallback(({ title, message, level }) => {
    notifications.add({
      title, message, level, autoDismiss: 10,
    });
  }, [notifications]);

  const reload = useCallback(() => {
    InventoryIntegrationFetcher.fetchInventories().then((response) => setInventories(response?.inventories || []));
    InventoryIntegrationFetcher.fetchConnections().then((response) => setConnections(response?.connections || []));
  }, []);

  useEffect(() => {
    InventoryIntegrationFetcher.fetchAdapters().then((response) => {
      setStatus(response || { status: 'unknown' });
      if (response?.enabled) reload();
    });
  }, [reload]);

  if (!status) return null;
  if (status.status === 'misconfigured') {
    return (
      <Alert variant="danger">
        config/inventory_integration.yml is invalid:
        <ul className="mb-0">{(status.errors || []).map((error) => <li key={error}>{error}</li>)}</ul>
      </Alert>
    );
  }
  if (!status.enabled) {
    return (
      <Alert variant="info">
        The inventory integration is off on this server; IT turns it on in config/inventory_integration.yml.
      </Alert>
    );
  }

  return (
    <Tabs defaultActiveKey="inventories" className="mb-3">
      <Tab eventKey="inventories" title="Inventories">
        <InventoriesTab inventories={inventories} notify={notify} reload={reload} />
      </Tab>
      <Tab eventKey="connections" title="Connections">
        <ConnectionsTab
          connections={connections}
          inventories={inventories}
          adapters={status.adapters}
          credentialRefs={status.credential_refs || []}
          notify={notify}
          reload={reload}
        />
      </Tab>
    </Tabs>
  );
};

export default InventoryIntegrationAdmin;
