import React, { useState, useCallback } from 'react';
import PropTypes from 'prop-types';
import {
  Form, Button, Spinner, OverlayTrigger, Tooltip, Badge,
} from 'react-bootstrap';
import CopyableAlert from 'src/components/common/CopyableAlert';
import LlmProviderEditor, { BLANK_LLM_DRAFT } from 'src/components/llm/LlmProviderEditor';
import { llmProtocolShortLabel, CHAT_COMPLETIONS_PROTOCOL } from 'src/utilities/llmProtocols';

/**
 * A list of LLM providers a role may add to, edit, test and delete — the user's
 * own in AI settings, the institution's in the admin AI page. Which list it is
 * shows only in the labels and in the `api` it is handed.
 */

// ── One saved provider ───────────────────────────────────────────────────────

const LlmProviderRow = ({
  provider, isDefault, onMakeDefault, onEdit, onDelete, onTest, testing,
  confirmingDelete, onConfirmDelete, deleteHint, radioName,
}) => (
  <div className="border rounded p-2 mb-2">
    <div className="d-flex align-items-start gap-2">
      {onMakeDefault && (
        <Form.Check
          type="radio"
          name={radioName}
          id={`${radioName}-${provider.id}`}
          checked={isDefault}
          onChange={() => onMakeDefault(provider.id)}
          className="mt-1"
          title="Use this provider for tasks that name none"
        />
      )}
      <div className="flex-grow-1 text-break">
        <div>
          <strong>{provider.name}</strong>
          {isDefault && <Badge bg="primary" className="ms-2">Default</Badge>}
          <span className="text-muted small ms-2">{llmProtocolShortLabel(provider.api_protocol)}</span>
        </div>
        <div className="small text-muted">
          {provider.base_url && (
            <>
              <code>{provider.base_url}</code>
              {' · '}
            </>
          )}
          <code>{provider.default_model}</code>
          {' · '}
          {provider.api_key_masked ? <code>{provider.api_key_masked}</code> : 'no key'}
        </div>
      </div>
      <div className="d-flex gap-1 flex-shrink-0">
        <Button
          size="sm"
          variant="outline-primary"
          onClick={() => onTest(provider.id)}
          disabled={testing}
          title="Test this provider with its stored key"
        >
          {testing ? <Spinner size="sm" animation="border" /> : 'Test'}
        </Button>
        <Button size="sm" variant="outline-secondary" onClick={() => onEdit(provider)} title="Edit">
          <i className="fa fa-pencil" />
        </Button>
        <OverlayTrigger
          placement="top"
          overlay={<Tooltip id={`llm-delete-provider-${provider.id}`}>{deleteHint}</Tooltip>}
        >
          <Button size="sm" variant="outline-danger" onClick={() => onDelete(provider.id)} title="Delete">
            <i className="fa fa-trash-o" />
          </Button>
        </OverlayTrigger>
      </div>
    </div>
    {confirmingDelete && (
      <div className="d-flex gap-2 justify-content-end align-items-center mt-2">
        <span className="text-muted small me-auto">
          Delete
          {' '}
          <strong>{provider.name}</strong>
          ?
          {' '}
          {deleteHint}
        </span>
        <Button size="sm" variant="outline-secondary" onClick={() => onDelete(null)}>Cancel</Button>
        <Button size="sm" variant="danger" onClick={() => onConfirmDelete(provider.id)}>Delete provider</Button>
      </div>
    )}
  </div>
);

LlmProviderRow.propTypes = {
  provider: PropTypes.shape({
    id: PropTypes.number,
    name: PropTypes.string,
    api_protocol: PropTypes.string,
    base_url: PropTypes.string,
    default_model: PropTypes.string,
    api_key_masked: PropTypes.string,
  }).isRequired,
  isDefault: PropTypes.bool.isRequired,
  onMakeDefault: PropTypes.func,
  onEdit: PropTypes.func.isRequired,
  onDelete: PropTypes.func.isRequired,
  onTest: PropTypes.func.isRequired,
  testing: PropTypes.bool.isRequired,
  confirmingDelete: PropTypes.bool.isRequired,
  onConfirmDelete: PropTypes.func.isRequired,
  deleteHint: PropTypes.node.isRequired,
  radioName: PropTypes.string.isRequired,
};

LlmProviderRow.defaultProps = {
  onMakeDefault: null,
};

// ── The list ─────────────────────────────────────────────────────────────────

const LlmProviderList = ({
  providers, profiles, api, title, addLabel, emptyText, deleteHint, keyHelp,
  defaultProviderId, onMakeDefault, onChanged, radioName,
}) => {
  const [draft, setDraft] = useState(null);
  const [saving, setSaving] = useState(false);
  const [testingId, setTestingId] = useState(null);
  const [deletingId, setDeletingId] = useState(null);
  const [status, setStatus] = useState(null);

  const patchDraft = useCallback((patch) => setDraft((prev) => ({ ...prev, ...patch })), []);

  const startAdd = () => {
    setStatus(null);
    setDraft({ ...BLANK_LLM_DRAFT });
  };

  const startEdit = (provider) => {
    setStatus(null);
    setDraft({
      id: provider.id,
      name: provider.name || '',
      api_protocol: provider.api_protocol || CHAT_COMPLETIONS_PROTOCOL,
      base_url: provider.base_url || '',
      default_model: provider.default_model || '',
      api_key: '',
      api_key_masked: provider.api_key_masked || '',
    });
  };

  const handleSave = () => {
    setSaving(true);
    setStatus(null);
    const payload = {
      name: draft.name.trim(),
      api_protocol: draft.api_protocol,
      base_url: draft.base_url.trim(),
      default_model: draft.default_model.trim(),
    };
    // An untouched key field means "keep the stored one" — sending a blank would
    // read as "clear it".
    if (draft.api_key) payload.api_key = draft.api_key;

    const request = draft.id ? api.update(draft.id, payload) : api.create(payload);

    request
      .then(() => {
        setDraft(null);
        setStatus({ variant: 'success', message: draft.id ? 'Provider updated.' : 'Provider added.' });
        return onChanged();
      })
      .catch((err) => setStatus({ variant: 'danger', message: err.message || 'Could not save the provider.' }))
      .finally(() => setSaving(false));
  };

  const handleTest = (id) => {
    setTestingId(id);
    setStatus(null);
    api.verify(id)
      .then((res) => setStatus({ variant: 'success', message: res.message || 'Connection verified.' }))
      .catch((err) => setStatus({ variant: 'danger', message: err.message || 'Connection failed.' }))
      .finally(() => setTestingId(null));
  };

  const handleDelete = (id) => {
    setStatus(null);
    api.remove(id)
      .then(() => {
        setDeletingId(null);
        setStatus({ variant: 'success', message: 'Provider deleted.' });
        return onChanged();
      })
      .catch((err) => setStatus({ variant: 'danger', message: err.message || 'Could not delete the provider.' }));
  };

  // Removing a key changes what the list shows for that provider, so the row has
  // to be re-read even though the record itself is untouched.
  const handleDeleteKey = api.deleteKey
    ? (id) => api.deleteKey(id).then((res) => { onChanged(); return res; })
    : null;

  return (
    <div>
      <div className="d-flex align-items-center mb-2">
        <span className="fw-bold">{title}</span>
        <Button size="sm" variant="outline-primary" className="ms-auto" onClick={startAdd} disabled={!!draft}>
          <i className="fa fa-plus me-1" />
          {addLabel}
        </Button>
      </div>

      {providers.length === 0 && !draft && <p className="text-muted small">{emptyText}</p>}

      {providers.map((provider) => (
        <LlmProviderRow
          key={provider.id}
          provider={provider}
          isDefault={provider.id === defaultProviderId}
          onMakeDefault={onMakeDefault}
          onEdit={startEdit}
          onDelete={setDeletingId}
          onTest={handleTest}
          testing={testingId === provider.id}
          confirmingDelete={deletingId === provider.id}
          onConfirmDelete={handleDelete}
          deleteHint={deleteHint}
          radioName={radioName}
        />
      ))}

      {status && (
        <CopyableAlert variant={status.variant} onClose={() => setStatus(null)} className="mt-2">
          {status.message}
        </CopyableAlert>
      )}

      {draft && (
        <LlmProviderEditor
          draft={draft}
          profiles={profiles}
          onChange={patchDraft}
          onCancel={() => setDraft(null)}
          onSave={handleSave}
          onTest={api.testDraft}
          onDeleteKey={handleDeleteKey}
          saving={saving}
          keyHelp={keyHelp}
        />
      )}
    </div>
  );
};

LlmProviderList.propTypes = {
  providers: PropTypes.arrayOf(PropTypes.object).isRequired,
  profiles: PropTypes.arrayOf(PropTypes.object).isRequired,
  // The CRUD this list acts on — which list it is, is entirely in here.
  api: PropTypes.shape({
    create: PropTypes.func.isRequired,
    update: PropTypes.func.isRequired,
    remove: PropTypes.func.isRequired,
    verify: PropTypes.func.isRequired,
    testDraft: PropTypes.func.isRequired,
    deleteKey: PropTypes.func,
  }).isRequired,
  title: PropTypes.string.isRequired,
  addLabel: PropTypes.string.isRequired,
  emptyText: PropTypes.node.isRequired,
  deleteHint: PropTypes.node.isRequired,
  keyHelp: PropTypes.shape({
    hint: PropTypes.node,
    deleteConfirm: PropTypes.node,
  }).isRequired,
  defaultProviderId: PropTypes.number,
  // Omit to render no default-provider radio at all.
  onMakeDefault: PropTypes.func,
  // Reload the providers from the server after an add / edit / delete.
  onChanged: PropTypes.func.isRequired,
  radioName: PropTypes.string,
};

LlmProviderList.defaultProps = {
  defaultProviderId: null,
  onMakeDefault: null,
  radioName: 'llm-default-provider',
};

export default LlmProviderList;
