import React, { useState } from 'react';
import PropTypes from 'prop-types';
import { Badge, Button, ButtonGroup, Table } from 'react-bootstrap';
import InventoryIntegrationFetcher from 'src/fetchers/InventoryIntegrationFetcher';
import ConnectionEditor from 'src/apps/admin/inventoryIntegration/ConnectionEditor';

const STATUS_VARIANTS = {
  draft: 'secondary', active: 'success', paused: 'warning', error: 'danger',
};

function testSummary(connection) {
  if (!connection.last_test_at) return 'not tested';
  if (!connection.last_test_ok) return `failed: ${connection.last_test_report?.error?.message || 'see report'}`;
  return connection.tested ? 'passed' : 'passed, settings changed since';
}

// Connections of the inventories: test, map, activate. No data moves before a sync exists.
const ConnectionsTab = ({
  connections, inventories, adapters, credentialRefs, notify, reload,
}) => {
  const [editing, setEditing] = useState(null);
  const unconnected = inventories.filter((inventory) => !inventory.archived_at && !inventory.connection);

  const report = (title) => (response) => {
    if (response?.error) notify({ title, message: response.error, level: 'error' });
    reload();
  };

  const run = (connection, action) => InventoryIntegrationFetcher.connectionAction(connection.id, action)
    .then(report(`${connection.name}: ${action}`));

  // The adapter's built-in mapping, accepted as the active version.
  const applyBuiltInMapping = (connection) => InventoryIntegrationFetcher.draftPresetMapping(connection.id)
    .then((response) => (response?.mapping_version
      ? InventoryIntegrationFetcher.acceptMappingVersion(connection.id, response.mapping_version.id)
      : response))
    .then(report(`${connection.name}: mapping`));

  const archive = (connection) => {
    // eslint-disable-next-line no-alert
    if (!window.confirm(`Archive the connection "${connection.name}"?`)) return;
    InventoryIntegrationFetcher.archiveConnection(connection.id).then(reload);
  };

  const builtInMapping = (connection) => Boolean(
    adapters.find(({ key }) => key === connection.adapter_key)?.default_preset
  );

  return (
    <>
      <div className="d-flex justify-content-end mb-2">
        <Button size="sm" variant="primary" disabled={unconnected.length === 0} onClick={() => setEditing('new')}>
          New connection
        </Button>
      </div>
      <Table size="sm" hover>
        <thead>
          <tr>
            <th>Name</th>
            <th>Inventory</th>
            <th>System</th>
            <th>Status</th>
            <th>Test</th>
            <th>Mapping</th>
            <th aria-label="Actions" />
          </tr>
        </thead>
        <tbody>
          {connections.map((connection) => (
            <tr key={connection.id}>
              <td>{connection.name}</td>
              <td>{connection.collection_label}</td>
              <td>{connection.adapter_key}</td>
              <td><Badge bg={STATUS_VARIANTS[connection.status] || 'secondary'}>{connection.status}</Badge></td>
              <td>{testSummary(connection)}</td>
              <td>{connection.active_mapping_version_id ? 'active' : 'none'}</td>
              <td>
                <ButtonGroup size="sm">
                  <Button variant="light" onClick={() => setEditing(connection)}>Edit</Button>
                  <Button variant="light" onClick={() => run(connection, 'test')}>Test</Button>
                  {!connection.active_mapping_version_id && builtInMapping(connection) && (
                    <Button variant="light" onClick={() => applyBuiltInMapping(connection)}>
                      Use built-in mapping
                    </Button>
                  )}
                  {connection.status === 'active'
                    ? <Button variant="light" onClick={() => run(connection, 'pause')}>Pause</Button>
                    : (
                      <Button variant="light" disabled={!connection.tested} onClick={() => run(connection, 'activate')}>
                        Activate
                      </Button>
                    )}
                  <Button variant="light" onClick={() => archive(connection)}>Archive</Button>
                </ButtonGroup>
              </td>
            </tr>
          ))}
        </tbody>
      </Table>
      {editing && (
        <ConnectionEditor
          connection={editing === 'new' ? null : editing}
          adapters={adapters}
          inventories={editing === 'new' ? unconnected : inventories}
          credentialRefs={credentialRefs}
          onClose={() => setEditing(null)}
          onSaved={() => { setEditing(null); reload(); }}
        />
      )}
    </>
  );
};

ConnectionsTab.propTypes = {
  connections: PropTypes.arrayOf(PropTypes.object).isRequired,
  inventories: PropTypes.arrayOf(PropTypes.object).isRequired,
  adapters: PropTypes.arrayOf(PropTypes.object).isRequired,
  credentialRefs: PropTypes.arrayOf(PropTypes.string).isRequired,
  notify: PropTypes.func.isRequired,
  reload: PropTypes.func.isRequired,
};

export default ConnectionsTab;
