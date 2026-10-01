import React, {
  useState, useEffect, useCallback, useMemo,
} from 'react';
import PropTypes from 'prop-types';
import {
  Card, Form, Row, Col, Button, Alert, Spinner, Badge,
} from 'react-bootstrap';
import { CreatableSelect } from 'src/components/common/Select';
import CopyableAlert from 'src/components/common/CopyableAlert';
import LlmProviderList from 'src/components/llm/LlmProviderList';
import UsersFetcher from 'src/fetchers/UsersFetcher';
import { llmProtocolShortLabel } from 'src/utilities/llmProtocols';
import {
  institutionModelsKey, providerModelsKey, peekModels,
  fetchProviderModels, fetchInstitutionModels, subscribe, scopeToUser,
} from 'src/utilities/llmModelCache';

const PROVIDER_OPTIONS = [
  { value: 'global', label: "Use my institution's AI service (managed by admin)" },
  { value: 'custom', label: 'Use one of my own providers (OpenAI, Claude, Gemini, or a self-hosted endpoint)' },
];

// The value the per-task Provider select carries for "whatever my default is".
// A blank string, because that is what an unselected <option> gives back. Every
// other value is a provider id, which is unique across both lists.
const INHERIT = '';

const KEY_HELP = {
  hint: 'Encrypted at rest. Never returned by the API. Leave blank for endpoints '
    + 'that need no key (e.g. a local Ollama).',
  deleteConfirm: 'Remove this provider’s saved API key? It stops working until a new key is entered.',
};

const DELETE_HINT = 'Its API key is removed, and any task routed to it falls back to your default provider.';

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

// ── One institution provider, read-only ──────────────────────────────────────

const InstitutionProviderRow = ({
  provider, isDefault, selectable, onSelect, onTest, testing,
}) => (
  <div className="border rounded p-2 mb-2">
    <div className="d-flex align-items-start gap-2">
      {selectable && (
        <Form.Check
          type="radio"
          name="institution-provider"
          id={`institution-provider-${provider.id}`}
          checked={isDefault}
          onChange={() => onSelect(provider.id)}
          className="mt-1"
          title="Use this institution provider for tasks that name none"
        />
      )}
      <div className="flex-grow-1 text-break">
        <div>
          <strong>{provider.name}</strong>
          {isDefault && selectable && <Badge bg="primary" className="ms-2">Default</Badge>}
          <span className="text-muted small ms-2">{llmProtocolShortLabel(provider.api_protocol)}</span>
        </div>
        <div className="small text-muted">
          {provider.base_url && (
            <>
              Endpoint:
              {' '}
              <code>{provider.base_url}</code>
              {' · '}
            </>
          )}
          Default model:
          {' '}
          <code>{provider.default_model}</code>
        </div>
      </div>
      <Button
        size="sm"
        variant="outline-primary"
        onClick={() => onTest(provider.id)}
        disabled={testing}
        title="Test this provider with the key your administrator stored"
      >
        {testing ? <Spinner size="sm" animation="border" /> : 'Test'}
      </Button>
    </div>
  </div>
);

InstitutionProviderRow.propTypes = {
  provider: PropTypes.shape({
    id: PropTypes.number,
    name: PropTypes.string,
    api_protocol: PropTypes.string,
    base_url: PropTypes.string,
    default_model: PropTypes.string,
  }).isRequired,
  isDefault: PropTypes.bool.isRequired,
  // False when the institution runs a single provider: there is nothing to pick.
  selectable: PropTypes.bool.isRequired,
  onSelect: PropTypes.func.isRequired,
  onTest: PropTypes.func.isRequired,
  testing: PropTypes.bool.isRequired,
};

const LlmSettings = ({ userId }) => {
  const [providerType, setProviderType] = useState('global');
  const [profiles, setProfiles]         = useState([]);
  // The user's own providers, as returned by the API (keys masked).
  const [providers, setProviders]       = useState([]);
  const [defaultProviderId, setDefaultProviderId] = useState(null);
  const [taskMappings, setTaskMappings] = useState([]);
  // Every provider the admin set up, and which of them serves this user.
  const [institutionProviders, setInstitutionProviders] = useState([]);
  const [institutionProviderId, setInstitutionProviderId] = useState(null);
  const [customKeyAllowed, setCustomKeyAllowed] = useState(false);
  const [institutionAllowed, setInstitutionAllowed] = useState(false);
  const [legacyCustomNotice, setLegacyCustomNotice] = useState(false);
  // Snapshots of the saved state — used to detect meaningful (dirty) changes.
  const [savedProviderType, setSavedProviderType] = useState('global');
  const [savedDefaultProviderId, setSavedDefaultProviderId] = useState(null);
  const [savedInstitutionProviderId, setSavedInstitutionProviderId] = useState(null);
  const [savedTaskMappings, setSavedTaskMappings] = useState([]);
  const [status, setStatus]             = useState(null); // save result { variant, message }
  const [verifyStatus, setVerifyStatus] = useState(null); // institution test result
  const [verifyingId, setVerifyingId]   = useState(null);
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

  // Which ids belong to the institution: the same select lists both kinds, and
  // only the institution's are read through the institution endpoint.
  const institutionIds = useMemo(
    () => new Set(institutionProviders.map((p) => p.id)),
    [institutionProviders],
  );

  const countLoad = useCallback((promise) => {
    setModelLoads((n) => n + 1);
    return promise.finally(() => setModelLoads((n) => n - 1));
  }, []);

  const loadProviderModels = useCallback(
    (id, opts) => countLoad(fetchProviderModels(id, opts)),
    [countLoad],
  );
  const loadInstitutionModels = useCallback(
    (id, opts) => countLoad(fetchInstitutionModels(id, opts)),
    [countLoad],
  );

  const applySettings = useCallback((data) => {
    const {
      setting = {},
      providers: ownProviders,
      task_mappings: mappings,
      institution_providers: institution,
      ai_user_api_key_allowed: keyAllowed,
      ai_global_provider_allowed: instAllowed,
    } = data;

    const personal = !!keyAllowed;
    const institutionOk = !!instAllowed;

    // Choose a valid initial provider mode given the user's granted gates.
    let type = setting.provider_type || 'global';
    if (setting.provider_type === 'custom' && !personal) setLegacyCustomNotice(true);
    if (type === 'custom' && !personal) type = institutionOk ? 'global' : 'custom';
    if (type === 'global' && !institutionOk) type = personal ? 'custom' : 'global';

    setProviderType(type);
    setProviders(ownProviders || []);
    setDefaultProviderId(setting.default_llm_provider_id || null);
    setInstitutionProviderId(setting.institution_llm_provider_id || null);
    setTaskMappings(mappings || []);
    setInstitutionProviders(institution || []);
    setCustomKeyAllowed(personal);
    setInstitutionAllowed(institutionOk);
    setSavedProviderType(type);
    setSavedDefaultProviderId(setting.default_llm_provider_id || null);
    setSavedInstitutionProviderId(setting.institution_llm_provider_id || null);
    setSavedTaskMappings(mappings || []);
    return { type, institution: institution || [], providers: ownProviders || [] };
  }, []);

  useEffect(() => {
    UsersFetcher.fetchLlmSettings()
      .then((data) => {
        const { institution, providers: own } = applySettings(data);

        // Warm the cache for the provider contexts this user can actually reach.
        // Each is a no-op once the cache holds a fresh list, so re-mounting the
        // settings tab costs no provider calls at all.
        institution.forEach((p) => loadInstitutionModels(p.id));
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

  const providerApi = useMemo(() => ({
    create:    (params)     => UsersFetcher.createLlmProvider(params),
    update:    (id, params) => UsersFetcher.updateLlmProvider(id, params),
    remove:    (id)         => UsersFetcher.deleteLlmProvider(id),
    verify:    (id)         => UsersFetcher.verifyLlmProvider(id),
    testDraft: (draft)      => UsersFetcher.verifyLlmApiKey({
      protocol: draft.api_protocol,
      base_url: draft.base_url,
      model:    draft.default_model,
      api_key:  draft.api_key,
    }),
  }), []);

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

  // Which institution provider serves a task that names none: the one picked, or
  // the first — the same fallback the server applies.
  const effectiveInstitutionId = institutionProviderId
    || (institutionProviders[0] || {}).id
    || null;

  // Which provider actually serves a task: the one the row names, or — for a row
  // that names none — whichever the "Default provider" choice above points at.
  const effectiveProviderKey = useCallback((mapping) => {
    if (mapping.llm_provider_id) {
      return institutionIds.has(mapping.llm_provider_id)
        ? institutionModelsKey(mapping.llm_provider_id)
        : providerModelsKey(mapping.llm_provider_id);
    }
    if (isCustomMode && defaultProviderId) return providerModelsKey(defaultProviderId);
    return institutionModelsKey(effectiveInstitutionId);
  }, [institutionIds, isCustomMode, defaultProviderId, effectiveInstitutionId]);

  const handleSave = useCallback((e) => {
    e.preventDefault();
    setStatus(null);

    const dirty = providerType !== savedProviderType
      || defaultProviderId !== savedDefaultProviderId
      || institutionProviderId !== savedInstitutionProviderId
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
      // Sent whatever the mode is: provider_type decides which pointer is read, and
      // nulling it here would lose the choice on the way back to 'custom'.
      default_llm_provider_id: defaultProviderId,
      institution_llm_provider_id: institutionProviderId,
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
        setSavedInstitutionProviderId(institutionProviderId);
        setSavedTaskMappings(taskMappings);
      })
      .catch((err) => setStatus({ variant: 'danger', message: err.message || 'Failed to save settings.' }));
  }, [
    providerType, defaultProviderId, institutionProviderId, taskMappings,
    savedProviderType, savedDefaultProviderId, savedInstitutionProviderId, savedTaskMappings,
  ]);

  // Institution-provider test. Personal providers are tested from their own row
  // in the list, which uses their stored key.
  const handleVerify = useCallback((id) => {
    setVerifyingId(id);
    setVerifyStatus(null);

    UsersFetcher.verifyLlmApiKey({ institution_provider_id: id })
      .then((res) => {
        setVerifyStatus({ variant: 'success', message: res.message || 'Connection verified.' });
        loadInstitutionModels(id, { force: true });
      })
      .catch((err) => setVerifyStatus({
        variant: 'danger',
        message: err.message || 'Verification failed. Ask your administrator to check the provider.',
      }))
      .finally(() => setVerifyingId(null));
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

  // Everything a task can be routed to: each institution provider the user is
  // allowed, and each of their own. Provider ids are unique across both lists,
  // so the id alone identifies the option.
  const routableProviders = [
    ...(institutionAllowed
      ? institutionProviders.map((p) => ({ id: p.id, label: `Institution: ${p.name}` }))
      : []),
    ...providers.map((p) => ({ id: p.id, label: p.name })),
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

          {/* The institution's providers (read-only) */}
          {institutionAllowed && (
            <Row className="mb-3">
              <Form.Label column className="col-form-label col-3 offset-1">
                {institutionProviders.length > 1 ? 'Institution providers' : 'Institution provider'}
              </Form.Label>
              <Col className="col-7">
                {institutionProviders.length === 0 ? (
                  <Alert variant="warning" className="mb-2">
                    No institution provider is configured yet. Please contact your administrator.
                  </Alert>
                ) : (
                  institutionProviders.map((p) => (
                    <InstitutionProviderRow
                      key={p.id}
                      provider={p}
                      isDefault={p.id === effectiveInstitutionId}
                      selectable={institutionProviders.length > 1}
                      onSelect={setInstitutionProviderId}
                      onTest={handleVerify}
                      testing={verifyingId === p.id}
                    />
                  ))
                )}
                <Form.Text className="text-muted d-block">
                  {institutionProviders.length > 1
                    ? 'Configured by your institution administrator. Pick the one your tasks use by default —'
                      + ' any of them can still be named per task below.'
                    : 'Configured by your institution administrator.'}
                </Form.Text>
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
                  api={providerApi}
                  title="My providers"
                  addLabel="Add provider"
                  emptyText="No providers yet. Add one to use your own API key — you can keep several
                    and send different tasks to different ones."
                  deleteHint={DELETE_HINT}
                  keyHelp={KEY_HELP}
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
                    // so two providers' models are never offered in one dropdown.
                    const options = toModelOptions(peekModels(effectiveProviderKey(mapping)));

                    return (
                      <tr key={taskName}>
                        <td className="align-middle text-truncate">{label}</td>
                        <td>
                          <Form.Select
                            size="sm"
                            value={mapping.llm_provider_id ? String(mapping.llm_provider_id) : INHERIT}
                            onChange={(e) => {
                              const id = e.target.value ? Number(e.target.value) : null;
                              // Changing provider clears the model: a model name
                              // belongs to the provider that offers it.
                              patchMapping(taskName, { llm_provider_id: id, model: '' });
                              if (id && institutionIds.has(id)) loadInstitutionModels(id);
                              else if (id) loadProviderModels(id);
                            }}
                          >
                            <option value={INHERIT}>(my default provider)</option>
                            {routableProviders.map((p) => (
                              <option key={p.id} value={String(p.id)}>{p.label}</option>
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
