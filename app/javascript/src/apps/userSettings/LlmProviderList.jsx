import React, { useState, useCallback, useMemo } from 'react';
import PropTypes from 'prop-types';
import {
  Card, Form, Row, Col, Button, Spinner, InputGroup, OverlayTrigger, Tooltip, Badge,
} from 'react-bootstrap';
import CopyableAlert from 'src/components/common/CopyableAlert';
import UsersFetcher from 'src/fetchers/UsersFetcher';
import {
  LLM_PROTOCOL_OPTIONS, llmProtocolShortLabel, CHAT_COMPLETIONS_PROTOCOL,
} from 'src/utilities/llmProtocols';

/**
 * The user's own LLM providers: a list they can add to, edit, test and delete,
 * with one marked as the default.
 *
 * Each row is a separate record with its own endpoint, model and API key — which
 * is what makes several usable at once, and what lets a single task be routed to
 * one of them from the Task → Model table.
 */

const BLANK_DRAFT = {
  id: null,
  name: '',
  api_protocol: CHAT_COMPLETIONS_PROTOCOL,
  base_url: '',
  default_model: '',
  api_key: '',
  api_key_masked: '',
};

// A draft is complete when the request it describes could actually be made:
// every protocol needs a model, and a Chat Completions endpoint could be
// anyone's so it has to be given (the Anthropic and Gemini APIs default theirs).
const draftProblem = (draft) => {
  if (!draft.name.trim()) return 'Give this provider a name so you can tell it apart in the list.';
  if (!draft.default_model.trim()) return 'Enter the default model — every request carries one.';
  if (draft.api_protocol === CHAT_COMPLETIONS_PROTOCOL && !draft.base_url.trim()) {
    return `Enter the API endpoint URL (required for the ${llmProtocolShortLabel(CHAT_COMPLETIONS_PROTOCOL)}).`;
  }
  return null;
};

// ── Add / edit form ──────────────────────────────────────────────────────────

const LlmProviderEditor = ({
  draft, profiles, onChange, onCancel, onSave, saving,
}) => {
  const [testing, setTesting] = useState(false);
  const [testStatus, setTestStatus] = useState(null);

  const problem = draftProblem(draft);
  const editing = !!draft.id;

  // Which preset this draft describes. Derived rather than stored, so the picker
  // follows the fields instead of drifting from them.
  const matchedPreset = useMemo(() => profiles.find((p) => (
    (p.base_url || '').trim()
      && (p.protocol || 'openai') === draft.api_protocol
      && (p.base_url || '').trim() === (draft.base_url || '').trim()
  )), [profiles, draft.api_protocol, draft.base_url]);

  const applyPreset = (key) => {
    const preset = profiles.find((p) => p.key === key);
    if (!preset) return;
    // Every provider field is reset, so nothing leaks from the prior selection.
    onChange({
      name: preset.label || '',
      api_protocol: preset.protocol || CHAT_COMPLETIONS_PROTOCOL,
      base_url: preset.base_url || '',
      default_model: preset.default_model || '',
      api_key: '',
    });
    setTestStatus(null);
  };

  // The protocol is not an independent field: endpoint, model, key and preset all
  // describe ONE provider, so changing it clears the rest rather than leaving a
  // mix of two (a Gemini protocol still pointing at the KI-Toolbox URL).
  const changeProtocol = (value) => {
    onChange({
      api_protocol: value, base_url: '', default_model: '', api_key: '',
    });
    setTestStatus(null);
  };

  // Tests the values as typed, key included — so a provider can be checked before
  // it is saved. A saved provider is re-tested from the list instead, which uses
  // the stored key and needs nothing re-typed.
  const handleTest = () => {
    setTesting(true);
    setTestStatus(null);
    UsersFetcher.verifyLlmApiKey({
      protocol: draft.api_protocol,
      base_url: draft.base_url,
      model: draft.default_model,
      api_key: draft.api_key,
    })
      .then((res) => setTestStatus({ variant: 'success', message: res.message || 'Connection verified.' }))
      .catch((err) => setTestStatus({
        variant: 'danger',
        message: err.message || 'Verification failed. Check the key and endpoint.',
      }))
      .finally(() => setTesting(false));
  };

  return (
    <Card className="mb-3 border-primary">
      <Card.Header>{editing ? `Edit ${draft.name || 'provider'}` : 'Add a provider'}</Card.Header>
      <Card.Body>
        {profiles.length > 0 && (
          <Row className="mb-3">
            <Form.Label column className="col-4">Use a preset</Form.Label>
            <Col className="col-8">
              <Form.Select
                value={matchedPreset ? matchedPreset.key : ''}
                onChange={(e) => applyPreset(e.target.value)}
              >
                <option value="">(choose a provider to pre-fill…)</option>
                {profiles.map((p) => (
                  <option key={p.key} value={p.key}>{p.label}</option>
                ))}
              </Form.Select>
              <Form.Text className="text-muted d-block">
                Pre-fills the fields below. You still enter your own API key.
              </Form.Text>
              {matchedPreset?.notes && (
                <Form.Text className="text-muted d-block fst-italic">{matchedPreset.notes}</Form.Text>
              )}
            </Col>
          </Row>
        )}

        <Row className="mb-3">
          <Form.Label column className="col-4">
            Name
            <span className="text-danger ms-1" aria-hidden="true">*</span>
          </Form.Label>
          <Col className="col-8">
            <Form.Control
              type="text"
              placeholder="e.g. KI-Toolbox (my key)"
              value={draft.name}
              onChange={(e) => onChange({ name: e.target.value })}
            />
            <Form.Text className="text-muted">How this provider is labelled in your list and per task.</Form.Text>
          </Col>
        </Row>

        <Row className="mb-3">
          <Form.Label column className="col-4">API protocol</Form.Label>
          <Col className="col-8">
            <Form.Select
              value={draft.api_protocol}
              onChange={(e) => changeProtocol(e.target.value)}
            >
              {LLM_PROTOCOL_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </Form.Select>
            <Form.Text className="text-muted">
              The request format the endpoint speaks, not who runs it.
            </Form.Text>
          </Col>
        </Row>

        <Row className="mb-3">
          <Form.Label column className="col-4">API endpoint URL</Form.Label>
          <Col className="col-8">
            <Form.Control
              type="url"
              placeholder={draft.api_protocol === CHAT_COMPLETIONS_PROTOCOL
                ? 'https://your-endpoint/api  (or http://localhost:11434 for Ollama)'
                : '(optional — defaults to the official endpoint)'}
              value={draft.base_url}
              onChange={(e) => onChange({ base_url: e.target.value })}
            />
          </Col>
        </Row>

        <Row className="mb-3">
          <Form.Label column className="col-4">
            Default model
            <span className="text-danger ms-1" aria-hidden="true">*</span>
          </Form.Label>
          <Col className="col-8">
            <Form.Control
              type="text"
              placeholder="e.g. kit.qwen3.5-397b-A17b"
              value={draft.default_model}
              onChange={(e) => onChange({ default_model: e.target.value })}
            />
            <Form.Text className="text-muted">
              Used for every task that does not name its own model.
            </Form.Text>
          </Col>
        </Row>

        <Row className="mb-3">
          <Form.Label column className="col-4">API key</Form.Label>
          <Col className="col-8">
            {editing && draft.api_key_masked && !draft.api_key && (
              <p className="mb-1 text-muted small">
                Current:
                {' '}
                <code>{draft.api_key_masked}</code>
                {' '}
                — leave blank to keep it
              </p>
            )}
            <InputGroup>
              <Form.Control
                type="password"
                autoComplete="new-password"
                placeholder={editing ? 'Replace the stored key…' : 'Enter the API key for this provider…'}
                value={draft.api_key}
                onChange={(e) => onChange({ api_key: e.target.value })}
              />
              <Button
                variant="outline-primary"
                onClick={handleTest}
                disabled={testing || !!problem}
                title={problem || 'Test these values before saving'}
                className="d-inline-flex align-items-center justify-content-center"
                style={{ minWidth: '9rem' }}
              >
                {testing && <Spinner size="sm" animation="border" className="me-2" />}
                {testing ? 'Testing…' : 'Test connection'}
              </Button>
            </InputGroup>
            <Form.Text className="text-muted">
              Encrypted at rest. Never returned by the API. Leave blank for endpoints
              that need no key (e.g. a local Ollama).
            </Form.Text>
          </Col>
        </Row>

        {testStatus && (
          <CopyableAlert
            variant={testStatus.variant}
            onClose={() => setTestStatus(null)}
            className="mb-3"
          >
            {testStatus.message}
          </CopyableAlert>
        )}

        <div className="d-flex gap-2 justify-content-end align-items-center">
          {problem && <Form.Text className="text-muted me-auto">{problem}</Form.Text>}
          <Button variant="outline-secondary" onClick={onCancel}>Cancel</Button>
          <Button
            variant="primary"
            onClick={onSave}
            disabled={saving || !!problem}
            className="d-inline-flex align-items-center justify-content-center"
            style={{ minWidth: '9rem' }}
          >
            {saving && <Spinner size="sm" animation="border" className="me-2" />}
            {editing ? 'Save changes' : 'Add provider'}
          </Button>
        </div>
      </Card.Body>
    </Card>
  );
};

LlmProviderEditor.propTypes = {
  draft: PropTypes.shape({
    id: PropTypes.number,
    name: PropTypes.string,
    api_protocol: PropTypes.string,
    base_url: PropTypes.string,
    default_model: PropTypes.string,
    api_key: PropTypes.string,
    api_key_masked: PropTypes.string,
  }).isRequired,
  profiles: PropTypes.arrayOf(PropTypes.object).isRequired,
  onChange: PropTypes.func.isRequired,
  onCancel: PropTypes.func.isRequired,
  onSave: PropTypes.func.isRequired,
  saving: PropTypes.bool.isRequired,
};

// ── One saved provider ───────────────────────────────────────────────────────

const LlmProviderRow = ({
  provider, isDefault, onMakeDefault, onEdit, onDelete, onTest, testing, confirmingDelete, onConfirmDelete,
}) => (
  <div className="border rounded p-2 mb-2">
    <div className="d-flex align-items-start gap-2">
      <Form.Check
        type="radio"
        name="llm-default-provider"
        id={`llm-default-provider-${provider.id}`}
        checked={isDefault}
        onChange={() => onMakeDefault(provider.id)}
        className="mt-1"
        title="Use this provider for tasks that name none"
      />
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
          overlay={(
            <Tooltip id={`llm-delete-provider-${provider.id}`}>
              Delete this provider and its key. Tasks routed to it fall back to your default.
            </Tooltip>
          )}
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
          ? Its API key is removed, and any task routed to it falls back to your default provider.
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
  onMakeDefault: PropTypes.func.isRequired,
  onEdit: PropTypes.func.isRequired,
  onDelete: PropTypes.func.isRequired,
  onTest: PropTypes.func.isRequired,
  testing: PropTypes.bool.isRequired,
  confirmingDelete: PropTypes.bool.isRequired,
  onConfirmDelete: PropTypes.func.isRequired,
};

// ── The list ─────────────────────────────────────────────────────────────────

const LlmProviderList = ({
  providers, profiles, defaultProviderId, onMakeDefault, onChanged,
}) => {
  const [draft, setDraft] = useState(null);
  const [saving, setSaving] = useState(false);
  const [testingId, setTestingId] = useState(null);
  const [deletingId, setDeletingId] = useState(null);
  const [status, setStatus] = useState(null);

  const patchDraft = useCallback((patch) => setDraft((prev) => ({ ...prev, ...patch })), []);

  const startAdd = () => {
    setStatus(null);
    setDraft({ ...BLANK_DRAFT });
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

    const request = draft.id
      ? UsersFetcher.updateLlmProvider(draft.id, payload)
      : UsersFetcher.createLlmProvider(payload);

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
    UsersFetcher.verifyLlmProvider(id)
      .then((res) => setStatus({ variant: 'success', message: res.message || 'Connection verified.' }))
      .catch((err) => setStatus({ variant: 'danger', message: err.message || 'Connection failed.' }))
      .finally(() => setTestingId(null));
  };

  const handleDelete = (id) => {
    setStatus(null);
    UsersFetcher.deleteLlmProvider(id)
      .then(() => {
        setDeletingId(null);
        setStatus({ variant: 'success', message: 'Provider deleted.' });
        return onChanged();
      })
      .catch((err) => setStatus({ variant: 'danger', message: err.message || 'Could not delete the provider.' }));
  };

  return (
    <div>
      <div className="d-flex align-items-center mb-2">
        <span className="fw-bold">My providers</span>
        <Button size="sm" variant="outline-primary" className="ms-auto" onClick={startAdd} disabled={!!draft}>
          <i className="fa fa-plus me-1" />
          Add provider
        </Button>
      </div>

      {providers.length === 0 && !draft && (
        <p className="text-muted small">
          No providers yet. Add one to use your own API key — you can keep several
          and send different tasks to different ones.
        </p>
      )}

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
          saving={saving}
        />
      )}
    </div>
  );
};

LlmProviderList.propTypes = {
  providers: PropTypes.arrayOf(PropTypes.object).isRequired,
  profiles: PropTypes.arrayOf(PropTypes.object).isRequired,
  defaultProviderId: PropTypes.number,
  onMakeDefault: PropTypes.func.isRequired,
  // Reload the providers from the server after an add / edit / delete.
  onChanged: PropTypes.func.isRequired,
};

LlmProviderList.defaultProps = {
  defaultProviderId: null,
};

export default LlmProviderList;
