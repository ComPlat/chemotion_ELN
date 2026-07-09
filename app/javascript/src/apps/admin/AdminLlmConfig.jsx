import React, { useState, useEffect, useCallback } from 'react';
import {
  Card, Form, Row, Col, Button, Alert, Spinner, OverlayTrigger, Tooltip,
} from 'react-bootstrap';
import { AsyncSelect } from 'src/components/common/Select';
import AdminFetcher from 'src/fetchers/AdminFetcher';
import { selectUserOptionFormater } from 'src/utilities/selectHelper';

// ── User search helper (mirrors MatrixManagement.js exactly) ─────────────────

const loadUserByName = (input) => {
  if (!input) return Promise.resolve([]);
  return AdminFetcher.fetchUsersByNameType(input, 'Person,Group')
    .then((res) => selectUserOptionFormater({ data: res, withType: true }))
    .catch(() => []);
};

// Wire protocols for the global provider endpoint. 'openai' = any OpenAI-compatible
// API (OpenAI, KI-Toolbox, vLLM, Ollama, …).
const PROTOCOL_OPTIONS = [
  { value: 'openai',    label: 'OpenAI-compatible' },
  { value: 'anthropic', label: 'Anthropic (Claude)' },
  { value: 'gemini',    label: 'Google (Gemini)' },
];

// Stable key identifying the exact provider config, to know whether the current
// form matches what was last successfully tested.
const providerConfigKey = (protocol, url, model, key) => (
  [protocol, (url || '').trim(), model, key || ''].join('|')
);

// Normalise a gate's users for change detection.
const gateKey = (g) => JSON.stringify({
  enabled: !!(g && g.enabled),
  inc: ((g && g.include_users) || []).map((u) => u.value).sort(),
  exc: ((g && g.exclude_users) || []).map((u) => u.value).sort(),
});

// ── Reusable feature-gate section with its own (change-gated) Save button ─────

function FeatureGateCard({
  title, enabledLabel, enabledHelp, includeHelp, excludeHelp, gate, saved, onChange, onSave,
}) {
  const { enabled = false, include_users = [], exclude_users = [] } = gate;
  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState(null);

  const dirty = gateKey(gate) !== gateKey(saved);

  const handleSave = () => {
    if (!dirty) {
      setStatus({ variant: 'warning', message: 'Nothing to save — no changes were made.' });
      return;
    }
    setSaving(true);
    setStatus(null);
    onSave()
      .then(() => setStatus({ variant: 'success', message: 'Saved.' }))
      .catch((err) => setStatus({ variant: 'danger', message: err.message || 'Save failed.' }))
      .finally(() => setSaving(false));
  };

  return (
    <Card className="mb-3">
      <Card.Header>{title}</Card.Header>
      <Card.Body>
        <Form.Group className="mb-3">
          <Form.Check
            type="checkbox"
            id={`gate-enabled-${title.replace(/\s+/g, '-').toLowerCase()}`}
            label={enabledLabel}
            checked={enabled}
            onChange={(e) => onChange({ enabled: e.target.checked })}
            className="fs-5"
          />
          <Form.Text className="text-muted ms-4">{enabledHelp}</Form.Text>
        </Form.Group>

        <Form.Group className="mb-3">
          <Form.Label>Include Users</Form.Label>
          <AsyncSelect
            isMulti
            value={include_users}
            matchProp="name"
            placeholder="Search by name or abbreviation…"
            loadOptions={loadUserByName}
            onChange={(val) => onChange({ include_users: val || [] })}
            menuPosition="fixed"
          />
          <Form.Text className="text-muted">{includeHelp}</Form.Text>
        </Form.Group>

        <Form.Group className="mb-3">
          <Form.Label>Exclude Users</Form.Label>
          <AsyncSelect
            isMulti
            value={exclude_users}
            matchProp="name"
            placeholder="Search by name or abbreviation…"
            loadOptions={loadUserByName}
            onChange={(val) => onChange({ exclude_users: val || [] })}
            menuPosition="fixed"
          />
          <Form.Text className="text-muted">{excludeHelp}</Form.Text>
        </Form.Group>

        {status && (
          <Alert variant={status.variant} dismissible onClose={() => setStatus(null)}>
            {status.message}
          </Alert>
        )}

        <div className="d-flex justify-content-end">
          <Button
            variant="primary"
            onClick={handleSave}
            disabled={saving}
            className="d-inline-flex align-items-center justify-content-center"
            style={{ minWidth: '11rem' }}
          >
            {saving && <Spinner size="sm" animation="border" className="me-2" />}
            {saving ? 'Saving…' : 'Save access settings'}
          </Button>
        </div>
      </Card.Body>
    </Card>
  );
}

// ── Global Provider section ───────────────────────────────────────────────────

function GlobalProviderCard({ provider: initialProvider, onSaved }) {
  const [name, setName]                 = useState(initialProvider?.name || 'Global LLM Provider');
  const [baseUrl, setBaseUrl]           = useState(initialProvider?.base_url || '');
  const [apiKey, setApiKey]             = useState('');
  const [apiKeyMasked, setApiKeyMasked] = useState(initialProvider?.api_key_masked || '');
  const [defaultModel, setDefaultModel] = useState(initialProvider?.default_model || '');
  const [protocol, setProtocol]         = useState(initialProvider?.api_protocol || 'openai');
  const [profiles, setProfiles]         = useState([]);
  const [status, setStatus]             = useState(null);
  const [verifying, setVerifying]       = useState(false);
  const [saving, setSaving]             = useState(false);
  const [confirmDeleteKey, setConfirmDeleteKey] = useState(false);
  const [verifiedConfig, setVerifiedConfig] = useState(null);
  // Saved snapshot (updated after a successful save) — for change detection + mask.
  const [savedName, setSavedName]         = useState(initialProvider?.name || 'Global LLM Provider');
  const [savedBaseUrl, setSavedBaseUrl]   = useState(initialProvider?.base_url || '');
  const [savedProtocol, setSavedProtocol] = useState(initialProvider?.api_protocol || 'openai');
  const [savedModel, setSavedModel]       = useState(initialProvider?.default_model || '');

  useEffect(() => {
    AdminFetcher.fetchLlmProviderProfiles()
      .then((list) => setProfiles(Array.isArray(list) ? list : []))
      .catch(() => {});
  }, []);

  // Apply a preset: RESET every field to the preset's values.
  const applyPreset = useCallback((key) => {
    const preset = profiles.find((p) => p.key === key);
    if (!preset) return;
    setProtocol(preset.protocol || 'openai');
    setBaseUrl(preset.base_url || '');
    setDefaultModel(preset.default_model || '');
    setName(preset.label || 'Global LLM Provider');
    setApiKey('');
  }, [profiles]);

  const performDeleteKey = useCallback(() => {
    setConfirmDeleteKey(false);
    AdminFetcher.deleteLlmApiKey()
      .then(() => {
        setApiKeyMasked('');
        setApiKey('');
        setStatus({ variant: 'success', message: 'Saved API key removed.' });
      })
      .catch((err) => setStatus({ variant: 'danger', message: err.message || 'Failed to remove the key.' }));
  }, []);

  // Test Connection sends live form values — no need to save first.
  const handleTest = useCallback(() => {
    setVerifying(true);
    setStatus(null);
    const testParams = { protocol, base_url: baseUrl, default_model: defaultModel };
    if (apiKey) testParams.api_key = apiKey;

    AdminFetcher.testLlmConfig(testParams)
      .then((res) => {
        setStatus({ variant: 'success', message: res.message || 'Connection verified.' });
        setVerifiedConfig(providerConfigKey(protocol, baseUrl, defaultModel, apiKey));
      })
      .catch((err) => setStatus({ variant: 'danger', message: err.message || 'Connection test failed.' }))
      .finally(() => setVerifying(false));
  }, [protocol, baseUrl, apiKey, defaultModel]);

  const handleSave = useCallback((e) => {
    e.preventDefault();

    const dirty = name !== savedName
      || protocol !== savedProtocol
      || baseUrl.trim() !== savedBaseUrl.trim()
      || defaultModel !== savedModel
      || !!apiKey;
    const verified = verifiedConfig === providerConfigKey(protocol, baseUrl, defaultModel, apiKey);

    if (!dirty) {
      setStatus({ variant: 'warning', message: 'Nothing to save — no changes were made.' });
      return;
    }
    if (!verified) {
      setStatus({
        variant: 'warning',
        message: 'Run a successful "Test Connection" for the current settings before saving.',
      });
      return;
    }

    setSaving(true);
    setStatus(null);
    const payload = {
      provider_name: name, provider_protocol: protocol, base_url: baseUrl, default_model: defaultModel,
    };
    if (apiKey) payload.api_key = apiKey;

    AdminFetcher.updateLlmConfig(payload)
      .then(() => {
        setStatus({ variant: 'success', message: 'Provider configuration saved.' });
        if (apiKey) setApiKeyMasked(`${apiKey.slice(0, 4)}••••`);
        setApiKey('');
        setSavedName(name);
        setSavedProtocol(protocol);
        setSavedBaseUrl(baseUrl);
        setSavedModel(defaultModel);
        // The saved config stays verified (key now stored → blank key part).
        setVerifiedConfig(providerConfigKey(protocol, baseUrl, defaultModel, ''));
        if (onSaved) onSaved();
      })
      .catch((err) => setStatus({ variant: 'danger', message: err.message || 'Save failed.' }))
      .finally(() => setSaving(false));
  }, [name, protocol, baseUrl, apiKey, defaultModel, savedName, savedProtocol, savedBaseUrl, savedModel, verifiedConfig, onSaved]);

  // Native protocols (anthropic/gemini) default their base URL; openai needs one.
  const canTest = defaultModel.trim().length > 0
    && (protocol !== 'openai' || baseUrl.trim().length > 0);

  // The saved key belongs to the saved provider identity — hide the mask + prompt
  // for a new key when the admin switches provider.
  const providerUnchanged = baseUrl.trim() === savedBaseUrl.trim() && protocol === savedProtocol;
  const showSavedKey = apiKeyMasked && !apiKey && providerUnchanged;
  const providerSwitched = apiKeyMasked && !apiKey && !providerUnchanged;

  return (
    <Card className="mb-3">
      <Card.Header>Global LLM Provider (institution service, for users granted access)</Card.Header>
      <Card.Body>
        <Form onSubmit={handleSave}>
          {profiles.length > 0 && (
            <Row className="mb-3">
              <Form.Label column className="col-3">Use a preset</Form.Label>
              <Col>
                <Form.Select defaultValue="" onChange={(e) => applyPreset(e.target.value)}>
                  <option value="">(choose a provider to pre-fill…)</option>
                  {profiles.map((p) => (
                    <option key={p.key} value={p.key}>{p.label}</option>
                  ))}
                </Form.Select>
                <Form.Text className="text-muted">
                  Pre-fills the fields below from
                  {' '}
                  <code>config/llm_provider_profiles.yml</code>
                  . You still enter the API key.
                </Form.Text>
              </Col>
            </Row>
          )}

          <Row className="mb-3">
            <Form.Label column className="col-3">Display name</Form.Label>
            <Col>
              <Form.Control type="text" value={name} onChange={(e) => setName(e.target.value)} />
              <Form.Text className="text-muted">
                A free-text label shown to users (e.g. &quot;KIT KI-Toolbox&quot;, &quot;Internal vLLM cluster&quot;).
              </Form.Text>
            </Col>
          </Row>

          <Row className="mb-3">
            <Form.Label column className="col-3">Provider type</Form.Label>
            <Col>
              <Form.Select value={protocol} onChange={(e) => setProtocol(e.target.value)}>
                {PROTOCOL_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </Form.Select>
            </Col>
          </Row>

          <Row className="mb-3">
            <Form.Label column className="col-3">Base URL</Form.Label>
            <Col>
              <Form.Control
                type="url"
                placeholder={protocol === 'openai'
                  ? 'https://ki-toolbox.scc.kit.edu/api'
                  : '(optional — defaults to the official endpoint)'}
                value={baseUrl}
                onChange={(e) => setBaseUrl(e.target.value)}
              />
              <Form.Text className="text-muted">
                {protocol === 'openai'
                  ? 'Any endpoint implementing the OpenAI /v1/chat/completions API (KI-Toolbox, OpenAI, vLLM, Ollama, …).'
                  : 'Leave blank to use the provider’s official endpoint.'}
              </Form.Text>
            </Col>
          </Row>

          <Row className="mb-3">
            <Form.Label column className="col-3">API Key</Form.Label>
            <Col>
              {showSavedKey && (
                <p className="mb-1 text-muted small">
                  Current:
                  {' '}
                  <code>{apiKeyMasked}</code>
                  {' '}
                  — enter a new key to replace
                </p>
              )}
              {providerSwitched && (
                <p className="mb-1 text-warning small">
                  You selected a different provider. Saving a verified API key for this provider will remove the saved API key for the previously configured provider.
                </p>
              )}
              <div className="d-flex gap-2">
                <Form.Control
                  type="password"
                  autoComplete="new-password"
                  placeholder={showSavedKey ? 'Replace existing key…' : 'Enter API key for this provider…'}
                  value={apiKey}
                  onChange={(e) => setApiKey(e.target.value)}
                />
                {apiKeyMasked && (
                  <OverlayTrigger
                    placement="top"
                    overlay={(
                      <Tooltip id="admin-delete-key-tip">
                        Permanently remove the institution provider’s saved API key.
                        Institution AI stops working for all users until a new key is entered.
                      </Tooltip>
                    )}
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
              </div>
              {confirmDeleteKey && (
                <Alert variant="warning" className="mt-2 mb-0 d-flex flex-column gap-2 p-2">
                  <div>
                    Remove the institution provider’s saved API key? Institution AI will stop
                    working for all users until a new key is entered.
                  </div>
                  <div className="d-flex gap-2 justify-content-end">
                    <Button size="sm" variant="outline-secondary" onClick={() => setConfirmDeleteKey(false)}>
                      Cancel
                    </Button>
                    <Button size="sm" variant="danger" onClick={performDeleteKey}>
                      Remove key
                    </Button>
                  </div>
                </Alert>
              )}
              <Form.Text className="text-muted">Encrypted at rest. Never returned in API responses.</Form.Text>
            </Col>
          </Row>

          <Row className="mb-3">
            <Form.Label column className="col-3">Default model</Form.Label>
            <Col>
              <Form.Control
                type="text"
                placeholder="e.g. kit.qwen3.5-397b-A17b"
                value={defaultModel}
                onChange={(e) => setDefaultModel(e.target.value)}
              />
            </Col>
          </Row>

          {status && (
            <Alert variant={status.variant} dismissible onClose={() => setStatus(null)}>
              {status.message}
            </Alert>
          )}

          <Row>
            <Col className="d-flex gap-2 justify-content-end align-items-center">
              <Form.Text className="text-muted me-auto">
                A successful Test Connection is required before saving.
              </Form.Text>
              <Button
                type="button"
                variant="outline-secondary"
                disabled={verifying || !canTest}
                onClick={handleTest}
                title={canTest ? 'Test with current form values' : 'Fill in the model (and Base URL for OpenAI-compatible) first'}
                className="d-inline-flex align-items-center justify-content-center"
                style={{ minWidth: '10rem' }}
              >
                {verifying && <Spinner size="sm" animation="border" className="me-2" />}
                {verifying ? 'Testing…' : 'Test Connection'}
              </Button>
              <Button
                type="submit"
                variant="primary"
                disabled={saving}
                className="d-inline-flex align-items-center justify-content-center"
                style={{ minWidth: '8.5rem' }}
              >
                {saving && <Spinner size="sm" animation="border" className="me-2" />}
                {saving ? 'Saving…' : 'Save provider'}
              </Button>
            </Col>
          </Row>
        </Form>
      </Card.Body>
    </Card>
  );
}

// ── Root component ────────────────────────────────────────────────────────────

const EMPTY_GATE = { enabled: false, include_users: [], exclude_users: [] };

export default function AdminLlmConfig() {
  const [keyGate, setKeyGate]           = useState(EMPTY_GATE);
  const [keyGateSaved, setKeyGateSaved] = useState(EMPTY_GATE);
  const [instGate, setInstGate]         = useState(EMPTY_GATE);
  const [instGateSaved, setInstGateSaved] = useState(EMPTY_GATE);
  const [provider, setProvider]         = useState(null);
  const [loading, setLoading]           = useState(true);
  const [topStatus, setTopStatus]       = useState(null);

  useEffect(() => {
    AdminFetcher.fetchLlmConfig()
      .then((cfg) => {
        const key = {
          enabled:       cfg.custom_key_enabled || false,
          include_users: cfg.custom_key_include_users || [],
          exclude_users: cfg.custom_key_exclude_users || [],
        };
        const inst = {
          enabled:       cfg.institution_enabled || false,
          include_users: cfg.institution_include_users || [],
          exclude_users: cfg.institution_exclude_users || [],
        };
        setKeyGate(key);
        setKeyGateSaved(key);
        setInstGate(inst);
        setInstGateSaved(inst);
        setProvider(cfg.provider || null);
      })
      .catch(() => setTopStatus({ variant: 'danger', message: 'Failed to load LLM configuration.' }))
      .finally(() => setLoading(false));
  }, []);

  const handleKeyGateChange = useCallback((patch) => setKeyGate((prev) => ({ ...prev, ...patch })), []);
  const handleInstGateChange = useCallback((patch) => setInstGate((prev) => ({ ...prev, ...patch })), []);

  const saveKeyGate = useCallback(() => AdminFetcher.updateLlmConfig({
    custom_key_enabled:     keyGate.enabled,
    custom_key_include_ids: (keyGate.include_users || []).map((u) => u.value),
    custom_key_exclude_ids: (keyGate.exclude_users || []).map((u) => u.value),
  }).then((r) => { setKeyGateSaved(keyGate); return r; }), [keyGate]);

  const saveInstGate = useCallback(() => AdminFetcher.updateLlmConfig({
    institution_enabled:     instGate.enabled,
    institution_include_ids: (instGate.include_users || []).map((u) => u.value),
    institution_exclude_ids: (instGate.exclude_users || []).map((u) => u.value),
  }).then((r) => { setInstGateSaved(instGate); return r; }), [instGate]);

  if (loading) {
    return (
      <div className="text-center py-5">
        <Spinner animation="border" />
        {' '}
        Loading AI configuration…
      </div>
    );
  }

  return (
    <div>
      <h4 className="mb-3">AI / LLM Configuration</h4>

      {topStatus && (
        <Alert variant={topStatus.variant} dismissible onClose={() => setTopStatus(null)}>
          {topStatus.message}
        </Alert>
      )}

      <GlobalProviderCard provider={provider} />

      <FeatureGateCard
        title="Institution Provider Access"
        enabledLabel="Allow all users to use the institution provider"
        enabledHelp="When checked, all users may use the institution global provider above (except those
          excluded). When unchecked, only users in the Include list may use it."
        includeHelp="When access is off, only these users may use the institution provider."
        excludeHelp="These users may never use the institution provider."
        gate={instGate}
        saved={instGateSaved}
        onChange={handleInstGateChange}
        onSave={saveInstGate}
      />

      <FeatureGateCard
        title="Personal API Key Permission"
        enabledLabel="Allow all users to configure their own API key / endpoint"
        enabledHelp="When checked, all users may set a personal provider (OpenAI-compatible, Claude, Gemini, …),
          except those excluded. When unchecked, only users in the Include list may — everyone else is limited to
          the institution provider (and only if they are granted institution access above)."
        includeHelp="When the permission is off, only these users may enter a personal API key."
        excludeHelp="These users may never enter a personal API key."
        gate={keyGate}
        saved={keyGateSaved}
        onChange={handleKeyGateChange}
        onSave={saveKeyGate}
      />
    </div>
  );
}
