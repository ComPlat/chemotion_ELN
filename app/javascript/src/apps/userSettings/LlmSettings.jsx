import React, {
  useState, useEffect, useCallback,
} from 'react';
import {
  Card, Form, Row, Col, Button, Alert, Spinner, InputGroup, OverlayTrigger, Tooltip,
} from 'react-bootstrap';
import { CreatableSelect } from 'src/components/common/Select';
import UsersFetcher from 'src/fetchers/UsersFetcher';

const PROVIDER_OPTIONS = [
  { value: 'global', label: "Use my institution's AI service (managed by admin)" },
  { value: 'custom', label: 'Use my own provider (OpenAI-compatible, Claude, or Gemini)' },
];

// Wire protocols for a custom endpoint. 'openai' covers any OpenAI-compatible API
// (OpenAI, KI-Toolbox, vLLM, Ollama, …); the two natives use their own APIs.
const PROTOCOL_OPTIONS = [
  { value: 'openai',    label: 'OpenAI-compatible' },
  { value: 'anthropic', label: 'Anthropic (Claude)' },
  { value: 'gemini',    label: 'Google (Gemini)' },
];

// A stable key identifying the exact provider config, so we know whether the
// current form matches what was last successfully tested.
const configKey = (mode, protocol, url, model, key) => (
  mode === 'custom' ? ['custom', protocol, (url || '').trim(), model, key || ''].join('|') : 'global'
);

// Map a list of model-name strings to react-select options.
const toModelOptions = (models) => (models || []).map((m) => ({ value: m, label: m }));

// Normalise task→model mappings for change detection (drop blanks, sort).
const normalizeMappings = (m) => JSON.stringify(
  (m || [])
    .filter((x) => x.model && x.model.trim())
    .map((x) => ({ task_name: x.task_name, model: x.model.trim() }))
    .sort((a, b) => a.task_name.localeCompare(b.task_name)),
);

// Tasks are loaded from the server-side LLM Task Registry (SF-04).
// Falls back to a minimal static list if the request fails.
const FALLBACK_TASKS = [
  { taskName: 'sds_extraction',     label: 'SDS Extraction' },
  { taskName: 'nmr_structuring',    label: 'NMR Data Structuring' },
  { taskName: 'report_generation',  label: 'Report Generation' },
  { taskName: 'research_assistant', label: 'Research Assistant' },
];

export default function LlmSettings() {
  const [providerType, setProviderType] = useState('global');
  const [apiProtocol, setApiProtocol]   = useState('openai');
  const [profiles, setProfiles]         = useState([]);
  const [baseUrl, setBaseUrl]           = useState('');
  const [apiKey, setApiKey]             = useState('');
  const [apiKeyMasked, setApiKeyMasked] = useState('');
  // The saved provider identity the masked key belongs to.
  const [savedBaseUrl, setSavedBaseUrl] = useState('');
  const [savedProtocol, setSavedProtocol] = useState('openai');
  const [defaultModel, setDefaultModel] = useState('');
  const [taskMappings, setTaskMappings] = useState([]);
  const [adminProvider, setAdminProvider] = useState(null);
  const [customKeyAllowed, setCustomKeyAllowed] = useState(false);
  const [institutionAllowed, setInstitutionAllowed] = useState(false);
  const [legacyCustomNotice, setLegacyCustomNotice] = useState(false);
  const [confirmDeleteKey, setConfirmDeleteKey] = useState(false);
  // Snapshots of the saved state — used to detect meaningful (dirty) changes.
  const [savedProviderType, setSavedProviderType] = useState('global');
  const [savedDefaultModel, setSavedDefaultModel] = useState('');
  const [savedTaskMappings, setSavedTaskMappings] = useState([]);
  // The exact provider config that last passed a Test connection.
  const [verifiedConfig, setVerifiedConfig] = useState(null);
  const [status, setStatus]             = useState(null); // save result { variant, message }
  const [verifyStatus, setVerifyStatus] = useState(null); // test/verify result (shown by the button)
  const [verifying, setVerifying]       = useState(false);
  const [loading, setLoading]           = useState(true);
  // Two *separate* model lists, each scoped to one provider context, so the
  // dropdown never mixes institution models with a personal provider's models.
  const [institutionModels, setInstitutionModels] = useState([]);
  const [customModels, setCustomModels]           = useState([]);
  const [loadingInstitutionModels, setLoadingInstitutionModels] = useState(false);
  const [loadingCustomModels, setLoadingCustomModels]           = useState(false);
  const [knownTasks, setKnownTasks]           = useState(FALLBACK_TASKS);

  useEffect(() => {
    UsersFetcher.fetchLlmSettings()
      .then((data) => {
        const {
          setting = {},
          task_mappings: mappings,
          admin_provider: adminProv,
          ai_user_api_key_allowed: keyAllowed,
          ai_global_provider_allowed: instAllowed,
        } = data;

        const personal = !!keyAllowed;
        const institution = !!instAllowed;

        // Choose a valid initial provider mode given the user's granted gates.
        let type = setting.provider_type || 'global';
        if (setting.provider_type === 'custom' && !personal) setLegacyCustomNotice(true);
        if (type === 'custom' && !personal) type = institution ? 'global' : 'custom';
        if (type === 'global' && !institution) type = personal ? 'custom' : 'global';

        setProviderType(type);
        setApiProtocol(setting.api_protocol || 'openai');
        setBaseUrl(setting.base_url || '');
        setSavedBaseUrl(setting.base_url || '');
        setSavedProtocol(setting.api_protocol || 'openai');
        setApiKeyMasked(setting.api_key_masked || '');
        setDefaultModel(setting.default_model || '');
        setTaskMappings(mappings || []);
        setAdminProvider(adminProv || null);
        setCustomKeyAllowed(personal);
        setInstitutionAllowed(institution);
        // Record saved snapshots for dirty tracking.
        setSavedProviderType(type);
        setSavedDefaultModel(setting.default_model || '');
        setSavedTaskMappings(mappings || []);

        // Pre-populate the custom model list from the saved custom config (blank
        // key → server reuses the stored key). Institution models load separately.
        if (type === 'custom') {
          setLoadingCustomModels(true);
          UsersFetcher.fetchLlmModelsForConfig({
            protocol: setting.api_protocol || 'openai',
            baseUrl:  setting.base_url || '',
            model:    setting.default_model || '',
          })
            .then((models) => setCustomModels(toModelOptions(models)))
            .finally(() => setLoadingCustomModels(false));
        }
      })
      .catch(() => setStatus({ variant: 'danger', message: 'Failed to load AI settings.' }))
      .finally(() => setLoading(false));
  }, []);

  // Load the institution (global) provider's model list once — this list is
  // shown only in institution mode and is independent of any custom config.
  useEffect(() => {
    setLoadingInstitutionModels(true);
    UsersFetcher.fetchInstitutionLlmModels()
      .then((models) => setInstitutionModels(toModelOptions(models)))
      .catch(() => {})
      .finally(() => setLoadingInstitutionModels(false));
  }, []);

  // Fetch task definitions from the server-side Task Registry (SF-04)
  useEffect(() => {
    UsersFetcher.fetchLlmTasks()
      .then((tasks) => {
        if (Array.isArray(tasks) && tasks.length > 0) {
          setKnownTasks(tasks.map((t) => ({
            taskName: t.name,
            label:    t.display_name || t.name,
          })));
        }
      })
      .catch(() => {}); // fall back to FALLBACK_TASKS silently
  }, []);

  // Fetch configurable provider presets (config/llm_provider_profiles.yml)
  useEffect(() => {
    UsersFetcher.fetchLlmProviderProfiles()
      .then((list) => setProfiles(Array.isArray(list) ? list : []))
      .catch(() => {});
  }, []);

  // Apply a preset: RESET every provider field to the preset's values (fields the
  // preset doesn't define are cleared, so nothing leaks from the prior selection).
  const applyPreset = useCallback((key) => {
    const preset = profiles.find((p) => p.key === key);
    if (!preset) return;
    setApiProtocol(preset.protocol || 'openai');
    setBaseUrl(preset.base_url || '');
    setDefaultModel(preset.default_model || '');
    setApiKey(''); // the key is provider-specific — never carry it across presets
    setVerifyStatus(null);
    // RESET the custom model list to this preset's curated list (or clear it, so
    // the previously-selected preset's models never linger). It is refreshed with
    // the live list after a successful Test connection.
    setCustomModels(
      Array.isArray(preset.models) && preset.models.length > 0
        ? toModelOptions(preset.models)
        : [],
    );
  }, [profiles]);

  const performDeleteKey = useCallback(() => {
    setConfirmDeleteKey(false);
    UsersFetcher.deleteLlmApiKey()
      .then(() => {
        setApiKeyMasked('');
        setApiKey('');
        setStatus({ variant: 'success', message: 'Your saved API key was removed.' });
      })
      .catch((err) => setStatus({ variant: 'danger', message: err.message || 'Failed to remove the key.' }));
  }, []);

  const getTaskModel = useCallback((taskName) => {
    const found = taskMappings.find((m) => m.task_name === taskName);
    return found ? found.model : '';
  }, [taskMappings]);

  const handleTaskModelChange = useCallback((taskName, model) => {
    setTaskMappings((prev) => {
      const others = prev.filter((m) => m.task_name !== taskName);
      // keep the entry even when blank — server will remove it
      return [...others, { task_name: taskName, model }];
    });
  }, []);

  const handleSave = useCallback((e) => {
    e.preventDefault();
    setStatus(null);

    // Only save meaningful changes, and only when the current setup passed a test.
    const providerConfigDirty = providerType !== savedProviderType
      || (providerType === 'custom'
        && (apiProtocol !== savedProtocol
          || baseUrl.trim() !== (savedBaseUrl || '').trim()
          || defaultModel !== savedDefaultModel
          || !!apiKey));
    const taskMappingsDirty = normalizeMappings(taskMappings) !== normalizeMappings(savedTaskMappings);
    const dirty = providerConfigDirty || taskMappingsDirty;
    const verified = verifiedConfig === configKey(providerType, apiProtocol, baseUrl, defaultModel, apiKey);

    if (!dirty) {
      setStatus({ variant: 'warning', message: 'Nothing to save — you haven’t changed anything.' });
      return;
    }
    if (!verified) {
      setStatus({
        variant: 'warning',
        message: 'Please run a successful "Test connection" for the current setup before saving.',
      });
      return;
    }

    const payload = {
      provider_type: providerType,
      task_mappings: taskMappings,
    };
    if (providerType === 'custom') {
      payload.api_protocol  = apiProtocol;
      payload.base_url      = baseUrl;
      payload.default_model = defaultModel;
    }
    if (apiKey) payload.api_key = apiKey;

    UsersFetcher.updateLlmSettings(payload)
      .then(() => {
        setStatus({ variant: 'success', message: 'AI settings saved.' });
        setApiKey(''); // clear plaintext key from state after save
        // Refresh saved snapshots so the form is no longer "dirty".
        setSavedProviderType(providerType);
        setSavedProtocol(apiProtocol);
        setSavedBaseUrl(baseUrl);
        setSavedDefaultModel(defaultModel);
        setSavedTaskMappings(taskMappings);
        if (apiKey) setApiKeyMasked(`${apiKey.slice(0, 3)}••••`);
        // The just-saved config remains verified (key now stored, so key part is blank).
        setVerifiedConfig(configKey(providerType, apiProtocol, baseUrl, defaultModel, ''));
      })
      .catch((err) => {
        setStatus({ variant: 'danger', message: err.message || 'Failed to save settings.' });
      });
  }, [
    providerType, apiProtocol, baseUrl, apiKey, defaultModel, taskMappings,
    savedProviderType, savedProtocol, savedBaseUrl, savedDefaultModel, savedTaskMappings, verifiedConfig,
  ]);

  const handleVerify = useCallback(() => {
    setVerifying(true);
    setVerifyStatus(null);

    const payload = {};
    if (providerType === 'custom') {
      payload.protocol = apiProtocol;
      payload.base_url = baseUrl;
      payload.model    = defaultModel;
    }
    if (apiKey) payload.api_key = apiKey;

    UsersFetcher.verifyLlmApiKey(payload)
      .then((res) => {
        setVerifyStatus({ variant: 'success', message: res.message || 'Connection verified.' });
        // Mark this exact config as verified so Save is unlocked.
        setVerifiedConfig(configKey(providerType, apiProtocol, baseUrl, defaultModel, apiKey));
        // Refresh the custom model list from the just-verified connection so the
        // Task→Model dropdown reflects the models this provider actually offers.
        if (providerType === 'custom') {
          setLoadingCustomModels(true);
          UsersFetcher.fetchLlmModelsForConfig({
            protocol: apiProtocol, baseUrl, model: defaultModel, apiKey,
          })
            .then((models) => { if (models.length > 0) setCustomModels(toModelOptions(models)); })
            .finally(() => setLoadingCustomModels(false));
        }
      })
      .catch((err) => setVerifyStatus({ variant: 'danger', message: err.message || 'Verification failed. Check key and endpoint.' }))
      .finally(() => setVerifying(false));
  }, [providerType, apiProtocol, baseUrl, apiKey, defaultModel]);

  if (loading) {
    return (
      <Card>
        <Card.Header>AI / LLM Settings</Card.Header>
        <Card.Body className="text-center py-4">
          <Spinner animation="border" size="sm" />
          {' '}
          Loading…
        </Card.Body>
      </Card>
    );
  }

  const providerOptions = PROVIDER_OPTIONS.filter((opt) => (
    (opt.value === 'global' && institutionAllowed)
    || (opt.value === 'custom' && customKeyAllowed)
  ));

  const isCustom = providerType === 'custom';

  // The Task→Model dropdown reflects ONLY the currently-selected provider's
  // models — institution models in institution mode, the custom provider's
  // models in custom mode — so the two never intermix.
  const modelOptions  = isCustom ? customModels : institutionModels;
  const modelsLoading = isCustom ? loadingCustomModels : loadingInstitutionModels;

  // The saved key belongs to the saved provider identity. If the user switches
  // provider (preset or manual edit of protocol/URL), hide the mask and prompt
  // for that provider's own key.
  const providerUnchanged = baseUrl.trim() === (savedBaseUrl || '').trim() && apiProtocol === savedProtocol;
  const showSavedKey = apiKeyMasked && !apiKey && providerUnchanged;
  const providerSwitched = apiKeyMasked && !apiKey && !providerUnchanged;

  return (
    <Card>
      <Card.Header>AI / LLM Settings</Card.Header>
      <Card.Body>
        <Form onSubmit={handleSave}>

          {legacyCustomNotice && (
            <Alert variant="warning" className="mx-1">
              Personal API keys are currently disabled by your administrator.
              Your account now uses the institution provider.
            </Alert>
          )}

          {/* Provider mode */}
          <Row className="mb-3">
            <Form.Label column className="col-form-label col-3 offset-1">
              LLM Provider
            </Form.Label>
            <Col className="col-7">
              {providerOptions.map((opt) => (
                <Form.Check
                  key={opt.value}
                  type="radio"
                  id={`llm-provider-${opt.value}`}
                  name="provider_type"
                  label={opt.label}
                  value={opt.value}
                  checked={providerType === opt.value}
                  onChange={() => setProviderType(opt.value)}
                />
              ))}
              {!customKeyAllowed && (
                <Form.Text className="text-muted d-block">
                  Personal API keys are enabled by your institution&apos;s administrator.
                </Form.Text>
              )}
            </Col>
          </Row>

          {/* Institution provider info (read-only) — shown in global mode */}
          {!isCustom && (
            <Row className="mb-3">
              <Col className="col-7 offset-4">
                {adminProvider ? (
                  <Alert variant="info" className="mb-2">
                    <div>
                      <strong>Institution provider:</strong>
                      {' '}
                      {adminProvider.name}
                    </div>
                    {adminProvider.base_url && (
                      <div className="small">
                        Endpoint:
                        {' '}
                        <code>{adminProvider.base_url}</code>
                      </div>
                    )}
                    {adminProvider.default_model && (
                      <div className="small">
                        Default model:
                        {' '}
                        <code>{adminProvider.default_model}</code>
                      </div>
                    )}
                    <div className="text-muted small mt-1">Configured by your institution administrator.</div>
                  </Alert>
                ) : (
                  <Alert variant="warning" className="mb-2">
                    No institution provider is configured yet. Please contact your administrator.
                  </Alert>
                )}
                <Button
                  variant="outline-primary"
                  size="sm"
                  onClick={handleVerify}
                  disabled={verifying || !adminProvider}
                  className="d-inline-flex align-items-center justify-content-center"
                  style={{ minWidth: '9.5rem' }}
                >
                  {verifying && <Spinner size="sm" animation="border" className="me-2" />}
                  {verifying ? 'Testing…' : 'Test connection'}
                </Button>
                {/* Verify/test result shown directly below the button */}
                {verifyStatus && (
                  <Alert
                    variant={verifyStatus.variant}
                    dismissible
                    onClose={() => setVerifyStatus(null)}
                    className="mt-2 mb-0"
                  >
                    {verifyStatus.message}
                  </Alert>
                )}
              </Col>
            </Row>
          )}

          {/* Custom endpoint / model / key — only in custom mode */}
          {isCustom && (
            <>
              {/* Preset picker (from config/llm_provider_profiles.yml) */}
              {profiles.length > 0 && (
                <Row className="mb-3">
                  <Form.Label column className="col-form-label col-3 offset-1">
                    Use a preset
                  </Form.Label>
                  <Col className="col-7">
                    <Form.Select
                      defaultValue=""
                      onChange={(e) => applyPreset(e.target.value)}
                    >
                      <option value="">(choose a provider to pre-fill…)</option>
                      {profiles.map((p) => (
                        <option key={p.key} value={p.key}>{p.label}</option>
                      ))}
                    </Form.Select>
                    <Form.Text className="text-muted">
                      Pre-fills the fields below. You still enter your own API key.
                    </Form.Text>
                  </Col>
                </Row>
              )}

              <Row className="mb-3">
                <Form.Label column className="col-form-label col-3 offset-1">
                  Provider type
                </Form.Label>
                <Col className="col-7">
                  <Form.Select
                    value={apiProtocol}
                    onChange={(e) => {
                      setApiProtocol(e.target.value);
                      // provider identity changed → drop the stale model list
                      setCustomModels([]);
                    }}
                  >
                    {PROTOCOL_OPTIONS.map((opt) => (
                      <option key={opt.value} value={opt.value}>{opt.label}</option>
                    ))}
                  </Form.Select>
                </Col>
              </Row>

              <Row className="mb-3">
                <Form.Label column className="col-form-label col-3 offset-1">
                  API Endpoint URL
                  <OverlayTrigger
                    placement="top"
                    overlay={(
                      <Tooltip id="llm-endpoint-tip">
                        For &quot;OpenAI-compatible&quot;, enter the endpoint (e.g. KI-Toolbox, vLLM,
                        Ollama). For Anthropic or Gemini, leave blank to use the official endpoint.
                      </Tooltip>
                    )}
                  >
                    <i className="fa fa-info-circle ms-1" />
                  </OverlayTrigger>
                </Form.Label>
                <Col className="col-7">
                  <Form.Control
                    type="url"
                    placeholder={apiProtocol === 'openai'
                      ? 'https://your-endpoint/api  (or http://localhost:11434 for Ollama)'
                      : '(optional — defaults to the official endpoint)'}
                    value={baseUrl}
                    onChange={(e) => {
                      setBaseUrl(e.target.value);
                      // endpoint changed → the model list must be re-fetched on Test
                      setCustomModels([]);
                    }}
                  />
                </Col>
              </Row>

              <Row className="mb-3">
                <Form.Label column className="col-form-label col-3 offset-1">
                  Default Model
                </Form.Label>
                <Col className="col-7">
                  <Form.Control
                    type="text"
                    placeholder="e.g. kit.qwen3.5-397b-A17b"
                    value={defaultModel}
                    onChange={(e) => setDefaultModel(e.target.value)}
                  />
                </Col>
              </Row>

              <Row className="mb-3">
                <Form.Label column className="col-form-label col-3 offset-1">
                  API Key
                </Form.Label>
                <Col className="col-7">
                  {showSavedKey && (
                    <p className="mb-1 text-muted small">
                      Current:
                      {' '}
                      <code>{apiKeyMasked}</code>
                      {' '}
                      — enter a new key below to replace it
                    </p>
                  )}
                  {providerSwitched && (
                    <p className="mb-1 text-warning small">
                      You changed the provider — enter the API key for this provider.
                      Your previously saved key belonged to the old provider and will be dropped.
                    </p>
                  )}
                  <InputGroup>
                    <Form.Control
                      type="password"
                      autoComplete="new-password"
                      placeholder={showSavedKey ? 'Replace existing key…' : 'Enter API key for this provider…'}
                      value={apiKey}
                      onChange={(e) => setApiKey(e.target.value)}
                    />
                    <Button
                      variant="outline-primary"
                      onClick={handleVerify}
                      disabled={verifying}
                      className="d-inline-flex align-items-center justify-content-center"
                      style={{ minWidth: '6.5rem' }}
                    >
                      {verifying && <Spinner size="sm" animation="border" className="me-2" />}
                      {verifying ? 'Testing…' : 'Verify'}
                    </Button>
                    {apiKeyMasked && (
                      <OverlayTrigger
                        placement="top"
                        overlay={(
                          <Tooltip id="llm-delete-key-tip">
                            Permanently remove your saved API key. AI features that use your
                            personal key will stop working until you enter a new one.
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
                  </InputGroup>
                  {confirmDeleteKey && (
                    <Alert variant="warning" className="mt-2 mb-0 d-flex flex-column gap-2 p-2">
                      <div>
                        Remove your saved API key? AI features that rely on your personal key
                        will stop working until you enter a new one.
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
                  <Form.Text className="text-muted d-block">
                    Encrypted at rest. Never stored in plaintext or returned via the API.
                    Leave blank for endpoints that need no key (e.g. local Ollama).
                  </Form.Text>
                  {/* Verify result shown directly below the Verify button */}
                  {verifyStatus && (
                    <Alert
                      variant={verifyStatus.variant}
                      dismissible
                      onClose={() => setVerifyStatus(null)}
                      className="mt-2 mb-0"
                    >
                      {verifyStatus.message}
                    </Alert>
                  )}
                </Col>
              </Row>
            </>
          )}

          {/* Task → Model overrides */}
          <Row className="mb-3">
            <Form.Label column className="col-form-label col-3 offset-1">
              Task → Model
            </Form.Label>
            <Col className="col-7">
              {/* Fixed table layout so a long model name never resizes the columns */}
              <table className="table table-sm table-bordered mb-1" style={{ tableLayout: 'fixed', width: '100%' }}>
                <colgroup>
                  <col style={{ width: '40%' }} />
                  <col style={{ width: '60%' }} />
                </colgroup>
                <thead>
                  <tr>
                    <th>Task</th>
                    <th>
                      Model for this task
                      <OverlayTrigger
                        placement="top"
                        overlay={(
                          <Tooltip id="llm-task-model-tip">
                            Optionally pick (or type) the model to use for this task.
                            The list shows the models offered by your currently-selected
                            provider. Leave blank to use the provider&apos;s default model.
                          </Tooltip>
                        )}
                      >
                        <i className="fa fa-info-circle ms-1" />
                      </OverlayTrigger>
                      {modelsLoading && <Spinner size="sm" animation="border" className="ms-1" />}
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {knownTasks.map(({ taskName, label }) => {
                    const currentModel = getTaskModel(taskName);
                    const selected = currentModel ? { value: currentModel, label: currentModel } : null;
                    return (
                      <tr key={taskName}>
                        <td className="align-middle text-truncate">{label}</td>
                        <td>
                          {/* Always a Creatable select — consistent height whether or
                              not the model list has loaded, and users can type a
                              custom model when the provider lists none. */}
                          <CreatableSelect
                            isClearable
                            isLoading={modelsLoading}
                            placeholder="(use default)"
                            options={modelOptions}
                            value={selected}
                            onChange={(opt) => handleTaskModelChange(taskName, opt ? opt.value : '')}
                            onCreateOption={(val) => handleTaskModelChange(taskName, val)}
                            formatCreateLabel={(val) => `Use "${val}"`}
                            menuPosition="fixed"
                          />
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
              <Form.Text className="text-muted">
                Leave blank to use the provider default model for that task.
                Type a name and press enter to use a model not in the list.
              </Form.Text>
            </Col>
          </Row>

          {/* Status / feedback */}
          {status && (
            <Alert
              variant={status.variant}
              dismissible
              onClose={() => setStatus(null)}
              className="mx-1"
            >
              {status.message}
            </Alert>
          )}

          <Row>
            <Col className="offset-8">
              <Button type="submit" variant="primary">Save AI settings</Button>
            </Col>
          </Row>

        </Form>
      </Card.Body>
    </Card>
  );
}
