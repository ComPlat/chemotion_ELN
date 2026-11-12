import React, { useState } from 'react';
import PropTypes from 'prop-types';
import { Button, Form, Table } from 'react-bootstrap';
import { AsyncSelect } from 'src/components/common/Select';
import UsersFetcher from 'src/fetchers/UsersFetcher';
import InventoryIntegrationFetcher from 'src/fetchers/InventoryIntegrationFetcher';
import { selectUserOptionFormater } from 'src/utilities/selectHelper';

const NEW_COLLECTION = 'new';

// Inventory collections: a person's collection whose samples are chemicals and whose shares
// carry inventory field access. The person stays the owner.
const InventoriesTab = ({ inventories, notify, reload }) => {
  const [owner, setOwner] = useState(null);
  const [candidates, setCandidates] = useState([]);
  const [choice, setChoice] = useState(NEW_COLLECTION);
  const [label, setLabel] = useState('');

  const loadPersons = (input) => (input
    ? UsersFetcher.fetchUsersByName(input, 'Person').then((res) => selectUserOptionFormater({ data: res }))
    : Promise.resolve([]));

  const pickOwner = (person) => {
    setOwner(person);
    setChoice(NEW_COLLECTION);
    setCandidates([]);
    if (person) {
      InventoryIntegrationFetcher.fetchCandidateCollections(person.id)
        .then((response) => setCandidates(response?.collections || []));
    }
  };

  const done = (title) => (response) => {
    if (response?.error) notify({ title, message: response.error, level: 'error' });
    reload();
  };

  const create = () => {
    const params = choice === NEW_COLLECTION
      ? { owner_id: owner.id, label: label.trim() }
      : { collection_id: Number(choice) };
    InventoryIntegrationFetcher.createInventory(params).then(done('New inventory')).then(() => {
      setOwner(null);
      setLabel('');
    });
  };

  const archive = (inventory) => {
    // eslint-disable-next-line no-alert
    if (!window.confirm(`Stop treating "${inventory.label}" as an inventory? Samples and shares stay.`)) return;
    InventoryIntegrationFetcher.archiveInventory(inventory.id).then(done(inventory.label));
  };

  return (
    <>
      <Form className="d-flex gap-2 align-items-end mb-3">
        <Form.Group className="flex-grow-1">
          <Form.Label>Owner (lab or inventory manager)</Form.Label>
          <AsyncSelect id="inventory-owner" value={owner} loadOptions={loadPersons} onChange={pickOwner} />
        </Form.Group>
        <Form.Group className="flex-grow-1" controlId="inventoryCollection">
          <Form.Label>Collection</Form.Label>
          <Form.Select value={choice} disabled={!owner} onChange={(e) => setChoice(e.target.value)}>
            <option value={NEW_COLLECTION}>New collection</option>
            {candidates.map(({ id, label: name }) => <option key={id} value={id}>{name}</option>)}
          </Form.Select>
        </Form.Group>
        {choice === NEW_COLLECTION && (
          <Form.Group className="flex-grow-1" controlId="inventoryLabel">
            <Form.Label>Name</Form.Label>
            <Form.Control value={label} disabled={!owner} onChange={(e) => setLabel(e.target.value)} />
          </Form.Group>
        )}
        <Button
          variant="primary"
          disabled={!owner || (choice === NEW_COLLECTION && !label.trim())}
          onClick={create}
        >
          Make inventory
        </Button>
      </Form>
      <Table size="sm" hover>
        <thead>
          <tr>
            <th>Collection</th>
            <th>Owner</th>
            <th>Connection</th>
            <th aria-label="Actions" />
          </tr>
        </thead>
        <tbody>
          {inventories.map((inventory) => (
            <tr key={inventory.id} className={inventory.archived_at ? 'text-muted' : undefined}>
              <td>{inventory.label}</td>
              <td>{inventory.owner}</td>
              <td>{inventory.connection ? `${inventory.connection.name} (${inventory.connection.status})` : 'none'}</td>
              <td>
                {inventory.archived_at
                  ? 'archived'
                  : <Button size="sm" variant="light" onClick={() => archive(inventory)}>Archive</Button>}
              </td>
            </tr>
          ))}
        </tbody>
      </Table>
    </>
  );
};

InventoriesTab.propTypes = {
  inventories: PropTypes.arrayOf(PropTypes.object).isRequired,
  notify: PropTypes.func.isRequired,
  reload: PropTypes.func.isRequired,
};

export default InventoriesTab;
