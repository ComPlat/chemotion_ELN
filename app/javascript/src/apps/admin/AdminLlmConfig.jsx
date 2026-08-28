import React, {
  useState, useEffect, useCallback, useMemo,
} from 'react';
import PropTypes from 'prop-types';
import {
  Card, Form, Button, Spinner, Tabs, Tab,
} from 'react-bootstrap';
import { AsyncSelect } from 'src/components/common/Select';
import CopyableAlert from 'src/components/common/CopyableAlert';
import LlmProviderList from 'src/components/llm/LlmProviderList';
import LlmProviderAccess, { loadUserByName } from 'src/components/llm/LlmProviderAccess';
import AdminFetcher from 'src/fetchers/AdminFetcher';

// Normalise a gate's users for change detection.
const gateKey = (g) => JSON.stringify({
  enabled: !!(g && g.enabled),
  inc: ((g && g.include_users) || []).map((u) => u.value).sort(),
  exc: ((g && g.exclude_users) || []).map((u) => u.value).sort(),
});

// ── Reusable feature-gate pane with its own (change-gated) Save button ────────

const FeatureGatePane = ({
  id, enabledLabel, enabledHelp, includeHelp, excludeHelp, gate, saved, onChange, onSave,
}) => {
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
    <>
      <Form.Group className="mb-3">
        <Form.Check
          type="checkbox"
          id={`gate-enabled-${id}`}
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
        <CopyableAlert variant={status.variant} onClose={() => setStatus(null)}>
          {status.message}
        </CopyableAlert>
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
    </>
  );
};

const GATE_SHAPE = PropTypes.shape({
  enabled: PropTypes.bool,
  include_users: PropTypes.arrayOf(PropTypes.object),
  exclude_users: PropTypes.arrayOf(PropTypes.object),
});

FeatureGatePane.propTypes = {
  id: PropTypes.string.isRequired,
  enabledLabel: PropTypes.string.isRequired,
  enabledHelp: PropTypes.string.isRequired,
  includeHelp: PropTypes.string.isRequired,
  excludeHelp: PropTypes.string.isRequired,
  gate: GATE_SHAPE.isRequired,
  saved: GATE_SHAPE.isRequired,
  onChange: PropTypes.func.isRequired,
  onSave: PropTypes.func.isRequired,
};

// ── Root component ────────────────────────────────────────────────────────────

const EMPTY_GATE = { enabled: false, include_users: [], exclude_users: [] };

const KEY_HELP = {
  hint: 'Encrypted at rest. Never returned in API responses. Leave blank for endpoints '
    + 'that need no key (e.g. a local Ollama).',
  deleteConfirm: 'Remove this provider’s saved API key? It stops working for every user '
    + 'until a new key is entered.',
};

const DELETE_HINT = 'Its API key is removed, and every user routed to it falls back to the '
  + 'first remaining institution provider.';

const AdminLlmConfig = () => {
  const [keyGate, setKeyGate]             = useState(EMPTY_GATE);
  const [keyGateSaved, setKeyGateSaved]   = useState(EMPTY_GATE);
  const [instGate, setInstGate]           = useState(EMPTY_GATE);
  const [instGateSaved, setInstGateSaved] = useState(EMPTY_GATE);
  const [providers, setProviders]         = useState([]);
  const [profiles, setProfiles]           = useState([]);
  const [loading, setLoading]             = useState(true);
  const [topStatus, setTopStatus]         = useState(null);

  const applyConfig = useCallback((cfg) => {
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
  }, []);

  const reloadProviders = useCallback(() => (
    AdminFetcher.fetchInstitutionLlmProviders()
      .then(setProviders)
      .catch(() => setTopStatus({ variant: 'danger', message: 'Failed to reload the provider list.' }))
  ), []);

  // The gates and the provider list are two resources; both are needed before
  // the page can render either tab.
  useEffect(() => {
    Promise.all([
      AdminFetcher.fetchLlmConfig().then(applyConfig),
      reloadProviders(),
    ])
      .catch(() => setTopStatus({ variant: 'danger', message: 'Failed to load LLM configuration.' }))
      .finally(() => setLoading(false));
  }, [applyConfig, reloadProviders]);

  useEffect(() => {
    AdminFetcher.fetchLlmProviderProfiles()
      .then((list) => setProfiles(Array.isArray(list) ? list : []))
      .catch(() => {});
  }, []);

  const providerApi = useMemo(() => ({
    create:    (params)     => AdminFetcher.createInstitutionLlmProvider(params),
    update:    (id, params) => AdminFetcher.updateInstitutionLlmProvider(id, params),
    remove:    (id)         => AdminFetcher.deleteInstitutionLlmProvider(id),
    verify:    (id)         => AdminFetcher.verifyInstitutionLlmProvider(id),
    deleteKey: (id)         => AdminFetcher.deleteInstitutionLlmApiKey(id),
    testDraft: (draft)      => AdminFetcher.testLlmConfig({
      protocol:      draft.api_protocol,
      base_url:      draft.base_url,
      default_model: draft.default_model,
      api_key:       draft.api_key,
    }),
  }), []);

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
        <CopyableAlert variant={topStatus.variant} onClose={() => setTopStatus(null)}>
          {topStatus.message}
        </CopyableAlert>
      )}

      <Card className="mb-3">
        <Card.Header>Institution providers (shared by every user granted access)</Card.Header>
        <Card.Body>
          <LlmProviderList
            providers={providers}
            profiles={profiles}
            api={providerApi}
            title="Institution providers"
            addLabel="Add provider"
            emptyText="No institution provider yet. Add one to offer users an AI service they need no key of
              their own for — you can keep several, and users pick which of them a task runs on."
            deleteHint={DELETE_HINT}
            keyHelp={KEY_HELP}
            onChanged={reloadProviders}
          />
        </Card.Body>
      </Card>

      <Card>
        <Card.Header>Who may use what</Card.Header>
        <Card.Body>
          <Tabs defaultActiveKey="institution-access" className="mb-3">
            <Tab eventKey="institution-access" title="Institution Provider Access">
              <FeatureGatePane
                id="institution-access"
                enabledLabel="Allow all users to use the institution providers"
                enabledHelp="When checked, all users may use the institution providers above (except those
                  excluded). When unchecked, only users in the Include list may use them."
                includeHelp="When access is off, only these users may use the institution providers."
                excludeHelp="These users may never use the institution providers."
                gate={instGate}
                saved={instGateSaved}
                onChange={handleInstGateChange}
                onSave={saveInstGate}
              />

              <hr className="my-4" />

              <h6>Per provider and per model</h6>
              <p className="text-muted small">
                The gate above decides who may use institution AI at all. These rules narrow it
                further — a whole provider, or a single one of its models, opened to or withheld
                from named users and groups.
              </p>
              <LlmProviderAccess providers={providers} onChanged={reloadProviders} />
            </Tab>
            <Tab eventKey="personal-keys" title="Personal API Key Permission">
              <FeatureGatePane
                id="personal-keys"
                enabledLabel="Allow all users to configure their own API key / endpoint"
                enabledHelp="When checked, all users may set up providers of their own (OpenAI, Claude,
                  Gemini, or a self-hosted endpoint), except those excluded. When unchecked, only users in the
                  Include list may — everyone else is limited to the institution providers (and only if they
                  are granted institution access)."
                includeHelp="When the permission is off, only these users may enter a personal API key."
                excludeHelp="These users may never enter a personal API key."
                gate={keyGate}
                saved={keyGateSaved}
                onChange={handleKeyGateChange}
                onSave={saveKeyGate}
              />
            </Tab>
          </Tabs>
        </Card.Body>
      </Card>
    </div>
  );
};

export default AdminLlmConfig;
