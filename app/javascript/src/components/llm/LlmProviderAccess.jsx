import React, { useState, useEffect, useCallback } from 'react';
import PropTypes from 'prop-types';
import {
  Card, Form, Button, Spinner, Badge, Collapse,
} from 'react-bootstrap';
import { AsyncSelect } from 'src/components/common/Select';
import CopyableAlert from 'src/components/common/CopyableAlert';
import AdminFetcher from 'src/fetchers/AdminFetcher';
import { selectUserOptionFormater } from 'src/utilities/selectHelper';

/**
 * Who may use each institution provider, and which of its models.
 *
 * A rule targets either the provider as a whole or one of its models, and reads
 * like every other access gate here: enabled means everyone except the excluded,
 * disabled means only the included. Rules narrow the Institution Provider Access
 * gate above them; they never widen it.
 */

// Mirrors MatrixManagement.js, so admins search users the same way everywhere.
export const loadUserByName = (input) => {
  if (!input) return Promise.resolve([]);
  return AdminFetcher.fetchUsersByNameType(input, 'Person,Group')
    .then((res) => selectUserOptionFormater({ data: res, withType: true }))
    .catch(() => []);
};

// The whole-provider rule carries no model; the select needs a value that is not
// the empty string, or the browser cannot tell it from "nothing chosen".
const WHOLE_PROVIDER = '*';

const toIds = (options) => (options || []).map((o) => o.value);

const ruleKey = (rule) => JSON.stringify({
  model: rule.model || null,
  enabled: !!rule.enabled,
  inc: toIds(rule.include_users).sort(),
  exc: toIds(rule.exclude_users).sort(),
});

const rulesKey = (rules, restrict) => JSON.stringify({
  restrict: !!restrict,
  rules: (rules || []).map(ruleKey).sort(),
});

// ── One rule ─────────────────────────────────────────────────────────────────

const AccessRule = ({
  rule, models, onChange, onRemove,
}) => (
  <div className="border rounded p-2 mb-2">
    <div className="d-flex align-items-center gap-2 mb-2">
      <Form.Label className="mb-0 flex-shrink-0">Applies to</Form.Label>
      <Form.Select
        size="sm"
        value={rule.model || WHOLE_PROVIDER}
        onChange={(e) => onChange({ model: e.target.value === WHOLE_PROVIDER ? null : e.target.value })}
        style={{ maxWidth: '22rem' }}
      >
        <option value={WHOLE_PROVIDER}>The provider itself (all models)</option>
        {models.map((m) => <option key={m} value={m}>{m}</option>)}
        {/* A rule may outlive the model it names — keep it selectable rather
            than silently retargeting it at the provider. */}
        {rule.model && !models.includes(rule.model) && (
          <option value={rule.model}>{`${rule.model} (not currently listed)`}</option>
        )}
      </Form.Select>
      <Button size="sm" variant="outline-danger" className="ms-auto" onClick={onRemove} title="Remove this rule">
        <i className="fa fa-trash-o" />
      </Button>
    </div>

    <div className="d-flex gap-3 mb-2">
      <Form.Check
        type="radio"
        id={`rule-open-${rule.model || 'provider'}`}
        name={`rule-mode-${rule.model || 'provider'}`}
        label="Everyone, except…"
        checked={!!rule.enabled}
        onChange={() => onChange({ enabled: true })}
      />
      <Form.Check
        type="radio"
        id={`rule-closed-${rule.model || 'provider'}`}
        name={`rule-mode-${rule.model || 'provider'}`}
        label="Only these users"
        checked={!rule.enabled}
        onChange={() => onChange({ enabled: false })}
      />
    </div>

    {/* Only the list that decides anything is shown; the other keeps its value
        so flipping the mode back does not discard it. */}
    {rule.enabled ? (
      <AsyncSelect
        isMulti
        value={rule.exclude_users || []}
        matchProp="name"
        placeholder="Users or groups to exclude…"
        loadOptions={loadUserByName}
        onChange={(val) => onChange({ exclude_users: val || [] })}
        menuPosition="fixed"
      />
    ) : (
      <AsyncSelect
        isMulti
        value={rule.include_users || []}
        matchProp="name"
        placeholder="Users or groups to allow…"
        loadOptions={loadUserByName}
        onChange={(val) => onChange({ include_users: val || [] })}
        menuPosition="fixed"
      />
    )}
  </div>
);

AccessRule.propTypes = {
  rule: PropTypes.shape({
    model: PropTypes.string,
    enabled: PropTypes.bool,
    include_users: PropTypes.arrayOf(PropTypes.object),
    exclude_users: PropTypes.arrayOf(PropTypes.object),
  }).isRequired,
  models: PropTypes.arrayOf(PropTypes.string).isRequired,
  onChange: PropTypes.func.isRequired,
  onRemove: PropTypes.func.isRequired,
};

// ── One provider's rules ─────────────────────────────────────────────────────

const ProviderAccessCard = ({ provider, expanded, onToggle, onChanged }) => {
  const [rules, setRules]       = useState(provider.grants || []);
  const [restrict, setRestrict] = useState(!!provider.restrict_models);
  const [models, setModels]     = useState([]);
  const [modelsLoaded, setModelsLoaded] = useState(false);
  const [saving, setSaving]     = useState(false);
  const [status, setStatus]     = useState(null);
  const [saved, setSaved]       = useState(rulesKey(provider.grants, provider.restrict_models));

  // What the provider itself lists — the admin writes rules about these, so it
  // is the unfiltered catalogue, not a user's filtered view of it.
  //
  // Read on first expand, not on mount: this calls the provider, and an
  // institution with several would otherwise be polled once per card every time
  // the page opens.
  useEffect(() => {
    if (!expanded || modelsLoaded) return undefined;

    let live = true;
    AdminFetcher.fetchInstitutionLlmModels(provider.id)
      .then((list) => { if (live) setModels(Array.isArray(list) ? list : []); })
      .catch(() => { if (live) setModels([]); })
      .finally(() => { if (live) setModelsLoaded(true); });
    return () => { live = false; };
  }, [expanded, modelsLoaded, provider.id]);

  const loadingModels = expanded && !modelsLoaded;

  const dirty = rulesKey(rules, restrict) !== saved;

  const patchRule = (index, patch) => setRules(
    (prev) => prev.map((r, i) => (i === index ? { ...r, ...patch } : r)),
  );

  const addRule = () => setRules((prev) => [
    ...prev,
    {
      model: prev.some((r) => !r.model) ? (models[0] || null) : null,
      enabled: true,
      include_users: [],
      exclude_users: [],
    },
  ]);

  const handleSave = () => {
    if (!dirty) {
      setStatus({ variant: 'warning', message: 'Nothing to save — no changes were made.' });
      return;
    }
    setSaving(true);
    setStatus(null);

    AdminFetcher.updateInstitutionLlmProvider(provider.id, { restrict_models: restrict })
      .then(() => AdminFetcher.updateInstitutionLlmGrants(provider.id, rules.map((r) => ({
        model: r.model || '',
        enabled: !!r.enabled,
        include_ids: toIds(r.include_users),
        exclude_ids: toIds(r.exclude_users),
      }))))
      .then(() => {
        setSaved(rulesKey(rules, restrict));
        setStatus({ variant: 'success', message: 'Access rules saved.' });
        return onChanged();
      })
      .catch((err) => setStatus({ variant: 'danger', message: err.message || 'Could not save the rules.' }))
      .finally(() => setSaving(false));
  };

  const summary = (() => {
    if (rules.length === 0) return restrict ? 'Restricted, no rule yet' : 'No rules';
    return `${rules.length} rule${rules.length === 1 ? '' : 's'}`;
  })();

  return (
    <Card className="mb-3">
      <Card.Header
        as="button"
        type="button"
        onClick={onToggle}
        aria-expanded={expanded}
        aria-controls={`provider-access-body-${provider.id}`}
        className="d-flex align-items-center gap-2 w-100 text-start border-0 bg-transparent"
      >
        <i className={`fa fa-fw ${expanded ? 'fa-caret-down' : 'fa-caret-right'}`} aria-hidden="true" />
        <span className="fw-bold">{provider.name}</span>
        {provider.base_url && <code className="small text-muted">{provider.base_url}</code>}
        {dirty && <Badge bg="warning" text="dark">Unsaved</Badge>}
        <Badge
          bg={rules.length > 0 ? 'secondary' : 'light'}
          text={rules.length > 0 ? undefined : 'dark'}
          className="ms-auto"
        >
          {summary}
        </Badge>
      </Card.Header>
      <Collapse in={expanded}>
        <div id={`provider-access-body-${provider.id}`}>
          <Card.Body>
            <Form.Check
              type="checkbox"
              id={`restrict-models-${provider.id}`}
              label="Offer only the models a rule below names"
              checked={restrict}
              onChange={(e) => setRestrict(e.target.checked)}
              className="mb-1"
            />
            <Form.Text className="text-muted d-block mb-3 ms-4">
              Leave this off to offer every model the provider lists, minus whatever a rule excludes.
            </Form.Text>

            {rules.length === 0 && (
              <p className="text-muted small">
                No rules. Everyone granted institution access may use this provider and every model it lists.
              </p>
            )}

            {rules.map((rule, index) => (
              <AccessRule
                // A rule is identified by what it targets; two rules can never share
                // a target, so this is stable across reorders.
                key={rule.model || 'the-provider'}
                rule={rule}
                models={models}
                onChange={(patch) => patchRule(index, patch)}
                onRemove={() => setRules((prev) => prev.filter((_, i) => i !== index))}
              />
            ))}

            {status && (
              <CopyableAlert variant={status.variant} onClose={() => setStatus(null)} className="mt-2">
                {status.message}
              </CopyableAlert>
            )}

            <div className="d-flex gap-2 justify-content-end align-items-center mt-2">
              {loadingModels && (
                <span className="text-muted small me-auto">
                  <Spinner size="sm" animation="border" className="me-1" />
                  Reading the provider’s model list…
                </span>
              )}
              <Button size="sm" variant="outline-primary" onClick={addRule}>
                <i className="fa fa-plus me-1" />
                Add rule
              </Button>
              <Button
                variant="primary"
                onClick={handleSave}
                disabled={saving}
                className="d-inline-flex align-items-center justify-content-center"
                style={{ minWidth: '10rem' }}
              >
                {saving && <Spinner size="sm" animation="border" className="me-2" />}
                {saving ? 'Saving…' : 'Save access rules'}
              </Button>
                </div>
          </Card.Body>
        </div>
      </Collapse>
    </Card>
  );
};

ProviderAccessCard.propTypes = {
  expanded: PropTypes.bool.isRequired,
  onToggle: PropTypes.func.isRequired,
  provider: PropTypes.shape({
    id: PropTypes.number,
    name: PropTypes.string,
    base_url: PropTypes.string,
    restrict_models: PropTypes.bool,
    grants: PropTypes.arrayOf(PropTypes.object),
  }).isRequired,
  onChanged: PropTypes.func.isRequired,
};

// ── Every provider ───────────────────────────────────────────────────────────

const LlmProviderAccess = ({ providers, onChanged }) => {
  const reload = useCallback(() => onChanged(), [onChanged]);
  // A single provider has nothing to scan past, so it opens straight away.
  const [openIds, setOpenIds] = useState(
    () => (providers.length === 1 ? [providers[0].id] : []),
  );

  const toggle = useCallback((id) => setOpenIds(
    (prev) => (prev.includes(id) ? prev.filter((o) => o !== id) : [...prev, id]),
  ), []);

  if (providers.length === 0) {
    return (
      <p className="text-muted small">
        No institution provider yet. Add one under Institution providers above, then set who may use it.
      </p>
    );
  }

  return (
    <div>
      {providers.map((provider) => (
        // Remounting on a reload is deliberate: the card holds the saved rules
        // as its own state, and a stale copy would show the wrong dirty mark.
        <ProviderAccessCard
          key={`${provider.id}-${(provider.grants || []).length}-${provider.restrict_models}`}
          provider={provider}
          expanded={openIds.includes(provider.id)}
          onToggle={() => toggle(provider.id)}
          onChanged={reload}
        />
      ))}
    </div>
  );
};

LlmProviderAccess.propTypes = {
  providers: PropTypes.arrayOf(PropTypes.object).isRequired,
  onChanged: PropTypes.func.isRequired,
};

export default LlmProviderAccess;
