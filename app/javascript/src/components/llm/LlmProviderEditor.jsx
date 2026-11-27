import React, { useState, useMemo } from 'react';
import PropTypes from 'prop-types';
import {
  Card, Form, Row, Col, Button, Spinner, InputGroup, OverlayTrigger, Tooltip, Alert,
} from 'react-bootstrap';
import CopyableAlert from 'src/components/common/CopyableAlert';
import {
  LLM_PROTOCOL_OPTIONS, llmProtocolShortLabel, CHAT_COMPLETIONS_PROTOCOL,
} from 'src/utilities/llmProtocols';

/**
 * Add / edit form for one LLM provider — an endpoint with its own protocol,
 * model and key. The same form serves a user's own providers and the
 * institution's: they are the same record, and differ only in who may use them.
 */

export const BLANK_LLM_DRAFT = {
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
export const llmDraftProblem = (draft) => {
  if (!draft.name.trim()) return 'Give this provider a name so you can tell it apart in the list.';
  if (!draft.default_model.trim()) return 'Enter the default model — every request carries one.';
  if (draft.api_protocol === CHAT_COMPLETIONS_PROTOCOL && !draft.base_url.trim()) {
    return `Enter the API endpoint URL (required for the ${llmProtocolShortLabel(CHAT_COMPLETIONS_PROTOCOL)}).`;
  }
  return null;
};

const LlmProviderEditor = ({
  draft, profiles, onChange, onCancel, onSave, onTest, onDeleteKey, saving, keyHelp,
}) => {
  const [testing, setTesting] = useState(false);
  const [testStatus, setTestStatus] = useState(null);
  const [confirmDeleteKey, setConfirmDeleteKey] = useState(false);

  const problem = llmDraftProblem(draft);
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
    onTest(draft)
      .then((res) => setTestStatus({ variant: 'success', message: res.message || 'Connection verified.' }))
      .catch((err) => setTestStatus({
        variant: 'danger',
        message: err.message || 'Verification failed. Check the key and endpoint.',
      }))
      .finally(() => setTesting(false));
  };

  const performDeleteKey = () => {
    setConfirmDeleteKey(false);
    setTestStatus(null);
    onDeleteKey(draft.id)
      .then(() => {
        onChange({ api_key: '', api_key_masked: '' });
        setTestStatus({ variant: 'success', message: 'Saved API key removed.' });
      })
      .catch((err) => setTestStatus({ variant: 'danger', message: err.message || 'Failed to remove the key.' }));
  };

  const canDeleteKey = editing && !!draft.api_key_masked && !!onDeleteKey;

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
                Pre-fills the fields below. You still enter the API key.
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
              placeholder="e.g. KIT KI-Toolbox"
              value={draft.name}
              onChange={(e) => onChange({ name: e.target.value })}
            />
            <Form.Text className="text-muted">How this provider is labelled in the list and per task.</Form.Text>
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
              {canDeleteKey && (
                <OverlayTrigger
                  placement="top"
                  overlay={<Tooltip id={`llm-delete-key-${draft.id}`}>Remove the saved API key</Tooltip>}
                >
                  <Button
                    variant="outline-danger"
                    onClick={() => setConfirmDeleteKey(true)}
                    title="Delete saved key"
                  >
                    <i className="fa fa-trash-o" />
                  </Button>
                </OverlayTrigger>
              )}
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
            {confirmDeleteKey && (
              <Alert variant="warning" className="mt-2 mb-0 d-flex flex-column gap-2 p-2">
                <div>{keyHelp.deleteConfirm}</div>
                <div className="d-flex gap-2 justify-content-end">
                  <Button size="sm" variant="outline-secondary" onClick={() => setConfirmDeleteKey(false)}>
                    Cancel
                  </Button>
                  <Button size="sm" variant="danger" onClick={performDeleteKey}>Remove key</Button>
                </div>
              </Alert>
            )}
            <Form.Text className="text-muted">{keyHelp.hint}</Form.Text>
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
  // Test the values as typed: (draft) => Promise<{ message }>.
  onTest: PropTypes.func.isRequired,
  // Drop a saved provider's stored key: (id) => Promise. Omit to hide the button.
  onDeleteKey: PropTypes.func,
  saving: PropTypes.bool.isRequired,
  keyHelp: PropTypes.shape({
    hint: PropTypes.node,
    deleteConfirm: PropTypes.node,
  }).isRequired,
};

LlmProviderEditor.defaultProps = {
  onDeleteKey: null,
};

export default LlmProviderEditor;
