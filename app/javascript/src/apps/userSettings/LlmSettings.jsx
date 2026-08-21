import React, { useState, useEffect, useCallback } from 'react';
import PropTypes from 'prop-types';
import {
  Card, Form, Row, Col, Button, Alert, Spinner,
} from 'react-bootstrap';
import { CreatableSelect } from 'src/components/common/Select';
import CopyableAlert from 'src/components/common/CopyableAlert';
import LlmProviderList from 'src/apps/userSettings/LlmProviderList';
import UsersFetcher from 'src/fetchers/UsersFetcher';
import {
  institutionModelsKey, providerModelsKey, peekModels,
  fetchProviderModels, fetchInstitutionModels, subscribe, scopeToUser,
} from 'src/utilities/llmModelCache';

const PROVIDER_OPTIONS = [
  { value: 'global', label: "Use my institution's AI service (managed by admin)" },
  { value: 'custom', label: 'Use one of my own providers (OpenAI, Claude, Gemini, or a self-hosted endpoint)' },
];

// The value the per-task Provider select carries for "whatever my default is".
// A blank string, because that is what an unselected <option> gives back.
const INHERIT = '';
// The per-task Provider select's value for the institution service. Prefixed so
// it can never collide with one of the user's own numeric provider ids.
const INSTITUTION = 'institution';

// Normalise task overrides for change detection: drop the empty ones (they mean
// "no override"), and sort, so a reordering is not a change.
const normalizeMappings = (mappings) => JSON.stringify(
  (mappings || [])
    .map((m) => ({
      task_name: m.task_name,
      model: (m.model || '').trim(),
      llm_provider_id: m.llm_provider_id || null,
    }))
    .filter((m) => m.model || m.llm_provider_id)
    .sort((a, b) => a.task_name.localeCompare(b.task_name)),
);

// Map a list of model-name strings to react-select options.
const toModelOptions = (models) => (models || []).map((m) => ({ value: m, label: m }));

// Tasks are loaded from the server-side LLM Task Registry (SF-04). This is only
// the fallback for a failed request, so it lists the task definitions that ship
// with this layer — one per config/llm_tasks/*.yml. Analysis tasks
// (nmr_structuring, spectral_extraction, …) arrive with their own branch and are
// picked up from the registry, so they must not be hard-coded here.
const FALLBACK_TASKS = [
  { taskName: 'sds_extraction', label: 'SDS Extraction' },
];

const LlmSettings = ({ userId }) => {
  const [providerType, setProviderType] = useState('global');
  const [profiles, setProfiles]         = useState([]);
  // The user's own providers, as returned by the API (keys masked).
  const [providers, setProviders]       = useState([]);
  const [defaultProviderId, setDefaultProviderId] = useState(null);
  const [taskMappings, setTaskMappings] = useState([]);
  const [adminProvider, setAdminProvider] = useState(null);
  const [customKeyAllowed, setCustomKeyAllowed] = useState(false);
  const [institutionAllowed, setInstitutionAllowed] = useState(false);
  const [legacyCustomNotice, setLegacyCustomNotice] = useState(false);
  // Snapshots of the saved state — used to detect meaningful (dirty) changes.
  const [savedProviderType, setSavedProviderType] = useState('global');
  const [savedDefaultProviderId, setSavedDefaultProviderId] = useState(null);
  const [savedTaskMappings, setSavedTaskMappings] = useState([]);
  const [status, setStatus]             = useState(null); // save result { variant, message }
  const [verifyStatus, setVerifyStatus] = useState(null); // institution test result
  const [verifying, setVerifying]       = useState(false);
  const [loading, setLoading]           = useState(true);
  const [knownTasks, setKnownTasks]     = useState(FALLBACK_TASKS);
  // Counts of in-flight lookups, not booleans: several provider lists can be
  // loading at once, and a boolean would let the first one to finish hide the
  // spinner while the others are still running.
  const [modelLoads, setModelLoads]     = useState(0);
  // The model lists themselves are NOT component state: they live in
  // llmModelCache, keyed by provider identity and shared across mounts, and are
  // read straight through during render. That is what makes switching between
  // providers restore each one's list. This counter exists only to re-render
  // when the cache changes.
  const [, noteCacheFilled] = useState(0);

  // Re-render on any cache write, including ones this component did not trigger.
  useEffect(() => subscribe(() => noteCacheFilled((n) => n + 1)), []);

  // Never show one user the lists cached for another (the cache is module level).
  useEffect(() => scopeToUser(userId), [userId]);

  const isCustomMode = providerType === 'custom';

  const countLoad = useCallback((promise) => {
    setModelLoads((n) => n + 1);
    return promise.finally(() => setModelLoads((n) => n - 1));
  }, []);

  const loadProviderModels = useCallback(
    (id, opts) => countLoad(fetchProviderModels(id, opts)),
    [countLoad],
  );
  const loadInstitutionModels = useCallback(
    (opts) => countLoad(fetchInstitutionModels(opts)),
    [countLoad],
  );

  const applySettings = useCallback((data) => {
    const {
      setting = {},
      providers: ownProviders,
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
    setProviders(ownProviders || []);
    setDefaultProviderId(setting.default_llm_provider_id || null);
    setTaskMappings(mappings || []);
    setAdminProvider(adminProv || null);
    setCustomKeyAllowed(personal);
    setInstitutionAllowed(institution);
    setSavedProviderType(type);
    setSavedDefaultProviderId(setting.default_llm_provider_id || null);
    setSavedTaskMappings(mappings || []);
    return { type, institution, providers: ownProviders || [] };
  }, []);

  useEffect(() => {
    UsersFetcher.fetchLlmSettings()
      .then((data) => {
        const { type, institution, providers: own } = applySettings(data);

        // Warm the cache for the provider contexts this user can actually reach.
        // Each is a no-op once the cache holds a fresh list, so re-mounting the
        // settings tab costs no provider calls at all.
        //
        // `type` is checked as well as the gate: when neither gate is granted the
        // mode resolution above still leaves `type` at 'global', and that renders
        // the institution dropdown — which must not be left permanently empty.
        if (institution || type === 'global') loadInstitutionModels();
        own.forEach((p) => loadProviderModels(p.id));
      })
      .catch(() => setStatus({ variant: 'danger', message: 'Failed to load AI settings.' }))
      .finally(() => setLoading(false));
    // The loaders are stable — this must stay a mount-only effect.
    // eslint-disable-next-line react-hooks/exhaustive-deps
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

  // Re-read the provider list after an add / edit / delete, and pick up the model
  // list of whatever was just saved. The server owns the default-provider
  // pointer (adding the first provider sets it), so the whole settings payload is
  // re-read rather than patched locally.
  const reloadProviders = useCallback(() => (
    UsersFetcher.fetchLlmSettings()
      .then((data) => {
        const { providers: own } = applySettings(data);
        own.forEach((p) => loadProviderModels(p.id, { force: true }));
      })
      .catch(() => setStatus({ variant: 'danger', message: 'Failed to reload your providers.' }))
  ), [applySettings, loadProviderModels]);

  const getMapping = useCallback(
    (taskName) => taskMappings.find((m) => m.task_name === taskName) || {},
    [taskMappings],
  );

  const patchMapping = useCallback((taskName, patch) => {
    setTaskMappings((prev) => {
      const current = prev.find((m) => m.task_name === taskName) || { task_name: taskName };
      const others  = prev.filter((m) => m.task_name !== taskName);
      // Blank entries are kept in state and dropped on save — that is how a row
      // is cleared back to "use my default".
      return [...others, { ...current, ...patch }];
    });
  }, []);

  // Which provider actually serves a task: the one the row names, or — for a row
  // that names none — whichever the "LLM Provider" choice above points at.
  const effectiveProviderKey = useCallback((mapping) => {
    if (mapping.llm_provider_id) {
      return mapping.llm_provider_id === (adminProvider || {}).id
        ? institutionModelsKey()
        : providerModelsKey(mapping.llm_provider_id);
    }
    if (isCustomMode && defaultProviderId) return providerModelsKey(defaultProviderId);
    return institutionModelsKey();
  }, [adminProvider, isCustomMode, defaultProviderId]);

  const handleSave = useCallback((e) => {
    e.preventDefault();
    setStatus(null);

    const dirty = providerType !== savedProviderType
      || defaultProviderId !== savedDefaultProviderId
      || normalizeMappings(taskMappings) !== normalizeMappings(savedTaskMappings);

    if (!dirty) {
      setStatus({ variant: 'warning', message: 'Nothing to save — you haven’t changed anything.' });
      return;
    }
    if (providerType === 'custom' && !defaultProviderId) {
      setStatus({
        variant: 'warning',
        message: 'Add a provider of your own (and pick which one is the default) before choosing that option.',
      });
      return;
    }

    UsersFetcher.updateLlmSettings({
      provider_type: providerType,
      default_llm_provider_id: providerType === 'custom' ? defaultProviderId : null,
      task_mappings: taskMappings.map((m) => ({
        task_name: m.task_name,
        model: m.model || '',
        llm_provider_id: m.llm_provider_id || null,
      })),
    })
      .then(() => {
        setStatus({ variant: 'success', message: 'AI settings saved.' });
        setSavedProviderType(providerType);
        setSavedDefaultProviderId(defaultProviderId);
        setSavedTaskMappings(taskMappings);
      })
      .catch((err) => setStatus({ variant: 'danger', message: err.message || 'Failed to save settings.' }));
  }, [
    providerType, defaultProviderId, taskMappings,
    savedProviderType, savedDefaultProviderId, savedTaskMappings,
  ]);

  // Institution-provider test. Personal providers are tested from their own row
  // in the list, which uses their stored key.
  const handleVerify = useCallback(() => {
    setVerifying(true);
    setVerifyStatus(null);

    UsersFetcher.verifyLlmApiKey({})
      .then((res) => {
        setVerifyStatus({ variant: 'success', message: res.message || 'Connection verified.' });
        loadInstitutionModels({ force: true });
      })
      .catch((err) => setVerifyStatus({
        variant: 'danger',
        message: err.message || 'Verification failed. Ask your administrator to check the provider.',
      }))
      .finally(() => setVerifying(false));
  }, [loadInstitutionModels]);

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

  // Everything a task can be routed to: the institution service (when the user
  // is allowed it) and each of the user's own providers.
  const routableProviders = [
    ...(institutionAllowed && adminProvider
      ? [{ value: INSTITUTION, id: adminProvider.id, label: `Institution: ${adminProvider.name}` }]
      : []),
    ...providers.map((p) => ({ value: String(p.id), id: p.id, label: p.name })),
  ];

  const modelsLoading = modelLoads > 0;

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

          {/* Which provider answers a task that names none */}
          <Row className="mb-3">
            <Form.Label column className="col-form-label col-3 offset-1">
              Default provider
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
              <Form.Text className="text-muted d-block">
                Used by every task that does not name a provider of its own, below.
              </Form.Text>
              {!customKeyAllowed && (
                <Form.Text className="text-muted d-block">
                  Your own providers are enabled by your institution&apos;s administrator.
                </Form.Text>
              )}
            </Col>
          </Row>

          {/* Institution provider info (read-only) */}
          {institutionAllowed && (
            <Row className="mb-3">
              <Col className="col-7 offset-4">
                {adminProvider ? (
                  <CopyableAlert variant="info" className="mb-2">
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
                  </CopyableAlert>
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
                {verifyStatus && (
                  <CopyableAlert
                    variant={verifyStatus.variant}
                    onClose={() => setVerifyStatus(null)}
                    className="mt-2 mb-0"
                  >
                    {verifyStatus.message}
                  </CopyableAlert>
                )}
              </Col>
            </Row>
          )}

          {/* The user's own providers */}
          {customKeyAllowed && (
            <Row className="mb-3">
              <Col className="col-7 offset-4">
                <LlmProviderList
                  providers={providers}
                  profiles={profiles}
                  defaultProviderId={defaultProviderId}
                  onMakeDefault={(id) => {
                    setDefaultProviderId(id);
                    setProviderType('custom');
                  }}
                  onChanged={reloadProviders}
                />
              </Col>
            </Row>
          )}

          {/* Task → Provider + Model overrides */}
          <Row className="mb-3">
            <Form.Label column className="col-form-label col-3 offset-1">
              Task routing
            </Form.Label>
            <Col className="col-7">
              {/* Fixed table layout so a long model name never resizes the columns */}
              <table className="table table-sm table-bordered mb-1" style={{ tableLayout: 'fixed', width: '100%' }}>
                <colgroup>
                  <col style={{ width: '30%' }} />
                  <col style={{ width: '32%' }} />
                  <col style={{ width: '38%' }} />
                </colgroup>
                <thead>
                  <tr>
                    <th>Task</th>
                    <th>Provider</th>
                    <th>
                      Model
                      {modelsLoading && <Spinner size="sm" animation="border" className="ms-1" />}
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {knownTasks.map(({ taskName, label }) => {
                    const mapping = getMapping(taskName);
                    const currentModel = mapping.model || '';
                    const selected = currentModel ? { value: currentModel, label: currentModel } : null;
                    // The row's models come from the provider the row resolves to,
                    // so the institution's models and a personal provider's are
                    // never offered in the same dropdown.
                    const options = toModelOptions(peekModels(effectiveProviderKey(mapping)));
                    const providerValue = (() => {
                      if (!mapping.llm_provider_id) return INHERIT;
                      if (mapping.llm_provider_id === (adminProvider || {}).id) return INSTITUTION;
                      return String(mapping.llm_provider_id);
                    })();

                    return (
                      <tr key={taskName}>
                        <td className="align-middle text-truncate">{label}</td>
                        <td>
                          <Form.Select
                            size="sm"
                            value={providerValue}
                            onChange={(e) => {
                              const choice = routableProviders.find((p) => p.value === e.target.value);
                              // Changing provider clears the model: a model name
                              // belongs to the provider that offers it.
                              patchMapping(taskName, { llm_provider_id: choice ? choice.id : null, model: '' });
                              if (choice && choice.value !== INSTITUTION) loadProviderModels(choice.id);
                            }}
                          >
                            <option value={INHERIT}>(my default provider)</option>
                            {routableProviders.map((p) => (
                              <option key={p.value} value={p.value}>{p.label}</option>
                            ))}
                          </Form.Select>
                        </td>
                        <td>
                          {/* Always a Creatable select — consistent height whether or
                              not the model list has loaded, and users can type a
                              custom model when the provider lists none. */}
                          <CreatableSelect
                            isClearable
                            isLoading={modelsLoading}
                            placeholder="(provider default)"
                            options={options}
                            value={selected}
                            onChange={(opt) => patchMapping(taskName, { model: opt ? opt.value : '' })}
                            onCreateOption={(val) => patchMapping(taskName, { model: val })}
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
                Leave a row alone to run that task on your default provider and its default
                model. Naming a provider but no model uses that provider&apos;s own default.
                Type a name and press enter to use a model not in the list.
              </Form.Text>
            </Col>
          </Row>

          {/* Status / feedback */}
          {status && (
            <CopyableAlert
              variant={status.variant}
              onClose={() => setStatus(null)}
              className="mx-1"
            >
              {status.message}
            </CopyableAlert>
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
};

LlmSettings.propTypes = {
  userId: PropTypes.number,
};

LlmSettings.defaultProps = {
  userId: null,
};

export default LlmSettings;
