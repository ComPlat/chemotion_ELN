import React, { useState } from 'react';
import PropTypes from 'prop-types';
import { Alert, Form } from 'react-bootstrap';
import AppModal from 'src/components/common/AppModal';
import { AsyncSelect } from 'src/components/common/Select';
import UsersFetcher from 'src/fetchers/UsersFetcher';
import InventoryIntegrationFetcher from 'src/fetchers/InventoryIntegrationFetcher';
import { selectUserOptionFormater } from 'src/utilities/selectHelper';
import SettingsForm from 'src/apps/admin/inventoryIntegration/SettingsForm';
import { FIELD_GROUPS } from 'src/apps/mydb/elements/list/selectionActions/InventoryFieldAccess';

const AUTHORITY_GROUPS = ['stock', 'location', 'procurement', 'people', 'notes'];

const draftFrom = (connection, inventories) => ({
  managed_collection_id: connection?.managed_collection_id ?? inventories[0]?.id ?? '',
  adapter_key: connection?.adapter_key ?? '',
  name: connection?.name ?? '',
  base_url: connection?.base_url ?? '',
  settings: connection?.settings ?? {},
  credentials: {},
  credentials_ref: connection?.credentials_ref ?? '',
  profile: connection?.profile ?? 'standard',
  field_authority: connection?.field_authority ?? {},
  sharees: (connection?.allowed_sharee_ids || []).map((id) => ({ id, value: id, label: `#${id}` })),
});

// Create or change a connection. It stays a draft until it is tested and activated.
const ConnectionEditor = ({
  connection, adapters, inventories, credentialRefs, onClose, onSaved,
}) => {
  const [draft, setDraft] = useState(() => draftFrom(connection, inventories));
  const [error, setError] = useState(null);
  const adapter = adapters.find(({ key }) => key === draft.adapter_key);
  const isNew = !connection;

  const set = (changes) => setDraft({ ...draft, ...changes });

  const loadSharees = (input) => (input
    ? UsersFetcher.fetchUsersByName(input, 'Person,Group')
      .then((res) => selectUserOptionFormater({ data: res, withType: true }))
    : Promise.resolve([]));

  const save = () => {
    const params = {
      name: draft.name,
      base_url: draft.base_url || null,
      settings: draft.settings,
      credentials: draft.credentials,
      profile: draft.profile,
      field_authority: draft.field_authority,
      allowed_sharee_ids: draft.sharees.map(({ id }) => id),
    };
    if (draft.credentials_ref) params.credentials_ref = draft.credentials_ref;
    const request = isNew
      ? InventoryIntegrationFetcher.createConnection({
        ...params, managed_collection_id: Number(draft.managed_collection_id), adapter_key: draft.adapter_key,
      })
      : InventoryIntegrationFetcher.updateConnection(
        connection.id,
        { ...params, lock_version: connection.lock_version }
      );
    request.then((response) => {
      if (response?.connection) {
        onSaved(response.connection);
      } else {
        setError(response?.error || 'The connection could not be saved');
      }
    });
  };

  const toggleAuthority = (group, external) => {
    const fieldAuthority = { ...draft.field_authority };
    if (external) fieldAuthority[group] = 'external'; else delete fieldAuthority[group];
    set({ field_authority: fieldAuthority });
  };

  return (
    <AppModal
      show
      onHide={onClose}
      title={isNew ? 'New connection' : `Connection "${connection.name}"`}
      primaryActionLabel="Save"
      onPrimaryAction={save}
      primaryActionDisabled={!draft.name || !draft.adapter_key || !draft.managed_collection_id}
      enforceFocus={false}
    >
      <Form>
        {error && <Alert variant="danger">{error}</Alert>}
        {isNew && (
          <>
            <Form.Group className="mb-2" controlId="connectionInventory">
              <Form.Label>Inventory</Form.Label>
              <Form.Select
                value={draft.managed_collection_id}
                onChange={(e) => set({ managed_collection_id: e.target.value })}
              >
                {inventories.map((inventory) => (
                  <option key={inventory.id} value={inventory.id}>{`${inventory.label} (${inventory.owner})`}</option>
                ))}
              </Form.Select>
            </Form.Group>
            <Form.Group className="mb-2" controlId="connectionAdapter">
              <Form.Label>System</Form.Label>
              <Form.Select
                value={draft.adapter_key}
                onChange={(e) => set({ adapter_key: e.target.value, settings: {} })}
              >
                <option value="">Pick a system</option>
                {adapters.map(({ key, name }) => <option key={key} value={key}>{name}</option>)}
              </Form.Select>
            </Form.Group>
          </>
        )}
        <Form.Group className="mb-2" controlId="connectionName">
          <Form.Label>Name</Form.Label>
          <Form.Control value={draft.name} onChange={(e) => set({ name: e.target.value })} />
        </Form.Group>
        <Form.Group className="mb-2" controlId="connectionBaseUrl">
          <Form.Label>Base URL</Form.Label>
          <Form.Control value={draft.base_url} onChange={(e) => set({ base_url: e.target.value })} />
          {adapter && (
            <Form.Text>{`Allowed hosts: ${adapter.allowed_hosts.join(', ') || 'none'}`}</Form.Text>
          )}
        </Form.Group>
        {credentialRefs.length > 0 && (
          <Form.Group className="mb-2" controlId="connectionCredentialsRef">
            <Form.Label>Credentials</Form.Label>
            <Form.Select value={draft.credentials_ref} onChange={(e) => set({ credentials_ref: e.target.value })}>
              <option value="">Enter them below</option>
              {credentialRefs.map((name) => <option key={name} value={name}>{`IT credential "${name}"`}</option>)}
            </Form.Select>
          </Form.Group>
        )}
        {adapter && (
          <SettingsForm
            schema={adapter.settings_schema}
            settings={draft.settings}
            credentials={draft.credentials}
            credentialsSet={Boolean(connection?.credentials_set)}
            secretsFromIt={Boolean(draft.credentials_ref)}
            onChange={({ settings, credentials }) => set({ settings, credentials })}
          />
        )}
        <Form.Group className="mb-2" controlId="connectionProfile">
          <Form.Label>Profile</Form.Label>
          <Form.Select value={draft.profile} onChange={(e) => set({ profile: e.target.value })}>
            <option value="standard">Standard</option>
            <option value="legal_register">Legal register</option>
          </Form.Select>
        </Form.Group>
        <Form.Group className="mb-2">
          <Form.Label>Fields the external system owns (read-only in Chemotion)</Form.Label>
          {AUTHORITY_GROUPS.map((group) => (
            <Form.Check
              key={group}
              id={`authority-${group}`}
              type="checkbox"
              label={FIELD_GROUPS[group].label}
              checked={draft.field_authority[group] === 'external'}
              onChange={(e) => toggleAuthority(group, e.target.checked)}
            />
          ))}
        </Form.Group>
        <Form.Group className="mb-2">
          <Form.Label>Owners may share this inventory only with (empty: anyone)</Form.Label>
          <AsyncSelect
            id="connection-sharees"
            isMulti
            value={draft.sharees}
            loadOptions={loadSharees}
            onChange={(sharees) => set({ sharees: sharees || [] })}
          />
        </Form.Group>
      </Form>
    </AppModal>
  );
};

ConnectionEditor.propTypes = {
  connection: PropTypes.shape({
    id: PropTypes.number,
    name: PropTypes.string,
    lock_version: PropTypes.number,
    credentials_set: PropTypes.bool,
  }),
  adapters: PropTypes.arrayOf(PropTypes.shape({ key: PropTypes.string, name: PropTypes.string })).isRequired,
  inventories: PropTypes.arrayOf(PropTypes.shape({ id: PropTypes.number, label: PropTypes.string })).isRequired,
  credentialRefs: PropTypes.arrayOf(PropTypes.string).isRequired,
  onClose: PropTypes.func.isRequired,
  onSaved: PropTypes.func.isRequired,
};

ConnectionEditor.defaultProps = {
  connection: null,
};

export default ConnectionEditor;
