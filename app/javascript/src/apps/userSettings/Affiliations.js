import React, { useState, useEffect, useRef } from 'react';
import ReactDOM from 'react-dom';
import DatePicker from 'react-datepicker';
import { Select } from 'src/components/common/Select';
import {
  Button, Overlay, OverlayTrigger, Table, Tooltip, Popover
} from 'react-bootstrap';

import UserSettingsFetcher from 'src/fetchers/UserSettingsFetcher';
import NotificationActions from 'src/stores/alt/actions/NotificationActions';
import OrganizationSelect from 'src/components/affiliation/OrganizationSelect';
import AffiliationSelect from 'src/components/affiliation/AffiliationSelect';

function Affiliations() {
  const [affiliations, setAffiliations] = useState([]);
  const [countryOptions, setCountryOptions] = useState([]);
  const [inputError, setInputError] = useState({});
  const [showConfirmIndex, setShowConfirmIndex] = useState(null);
  const [pendingSuggestions, setPendingSuggestions] = useState([]);
  // field: 'organization' | 'department' | 'group' | null — which suggestion popover is open
  const [suggestionPopover, setSuggestionPopover] = useState({ field: null, value: '' });
  const [orgHints, setOrgHints] = useState([]);

  // Refs for suggestion trigger buttons — passed to <Overlay target> to avoid
  // OverlayTrigger's dequal deep-compare hitting circular DOM/fiber refs.
  const orgTriggerRef = useRef(null);
  const deptTriggerRef = useRef(null);
  const groupTriggerRef = useRef(null);
  const suggestionTriggerRefs = { organization: orgTriggerRef, department: deptTriggerRef, group: groupTriggerRef };

  const savedEntries = affiliations.filter((entry) => entry.id);

  // Display dates in the browser's locale (built from parts to avoid a timezone shift).
  const displayDate = (v) => {
    if (!v) return '';
    const [y, m, d] = String(v).slice(0, 10).split('-');
    return new Date(y, m - 1, d).toLocaleDateString();
  };
  // DatePicker needs a Date object, built from parts to avoid a timezone shift.
  const parseDateValue = (v) => {
    if (!v) return null;
    const [y, m, d] = String(v).slice(0, 10).split('-');
    return new Date(y, m - 1, d);
  };
  const formatDateValue = (date) => {
    if (!date) return '';
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  };
  const isPast = (entry) => !!entry.to && new Date(entry.to) < new Date();
  const rorLink = (rorId) => rorId && (
    <a
      href={`https://ror.org/${rorId}`}
      target="_blank"
      rel="noopener noreferrer"
      className="ms-1"
      aria-label="View in ROR registry"
      title="View in ROR registry"
    >
      <i className="fa fa-external-link" />
    </a>
  );

  const getAllAffiliations = () => {
    UserSettingsFetcher.getAllAffiliations()
      .then((data) => {
        setAffiliations(data.map((item) => ({
          ...item,
          disabled: true,
        })));
      });
    setInputError({});
  };

  const refreshSuggestions = () => {
    UserSettingsFetcher.getPendingSuggestions()
      .then((data) => setPendingSuggestions(data || []));
  };

  useEffect(() => {
    UserSettingsFetcher.getAutoCompleteSuggestions('countries')
      .then((data) => {
        setCountryOptions(data.map((item) => ({ value: item.value, label: item.label })));
      })
      .catch((error) => {
        console.log(error);
        setInputError({});
      });

    getAllAffiliations();

    UserSettingsFetcher.getPendingSuggestions()
      .then((data) => setPendingSuggestions(data || []));
  }, []);

  // Debounced ROR hint search when the org suggestion popover is open.
  // Only fires for 3+ char queries; filters to results whose label contains the query
  // to avoid false positives from ROR's substring matching on short terms.
  useEffect(() => {
    const query = suggestionPopover.value.trim();
    if (suggestionPopover.field !== 'organization' || query.length < 3) {
      setOrgHints([]);
      return undefined;
    }
    const timer = setTimeout(() => {
      // Trust ROR's ranking (it resolves acronyms like "KIT" → Karlsruhe Institute
      // of Technology, which a literal substring filter would discard).
      UserSettingsFetcher.searchRorOrganizations(query)
        .then((results) => setOrgHints((results || []).slice(0, 5)));
    }, 400);
    return () => clearTimeout(timer);
  }, [suggestionPopover.value, suggestionPopover.field]);

  // Shallow-merge a patch into a single row by index.
  const patchRow = (index, patch) => setAffiliations(
    (prev) => prev.map((row, i) => (i === index ? { ...row, ...patch } : row)),
  );

  // Options are stored per row (item.deptOptions/item.groupOptions) so two rows
  // in edit mode at once never share — or clobber — each other's dropdowns.
  const loadRowDeptOptions = (index, organization, rorId) => {
    if (!organization && !rorId) { patchRow(index, { deptOptions: [] }); return; }
    UserSettingsFetcher.getAutoCompleteSuggestions('departments', organization, '', rorId)
      .then((data) => patchRow(index, { deptOptions: data || [] }));
  };

  const loadRowGroupOptions = (index, organization, department, rorId) => {
    if (!organization && !rorId) { patchRow(index, { groupOptions: [] }); return; }
    UserSettingsFetcher.getAutoCompleteSuggestions('groups', organization, department, rorId)
      .then((data) => patchRow(index, { groupOptions: data || [] }));
  };

  const clearFieldError = (index, field) => {
    setInputError((prev) => {
      if (!prev[index]) return prev;
      const next = { ...prev, [index]: { ...prev[index] } };
      delete next[index][field];
      if (Object.keys(next[index]).length === 0) delete next[index];
      return next;
    });
  };

  // Organization picks carry ROR data; apply org name, ror_id and country in a
  // single state update so a follow-up change can't clobber the others.
  const handleOrganizationChange = (index, choice) => {
    const organization = choice ? choice.label : '';
    // ROR results have value=ror_id (distinct from name); registry picks have value=label.
    const rorId = choice && choice.value && choice.value !== choice.label ? choice.value : '';
    const country = choice && choice.country ? choice.country : null;

    setAffiliations((prev) => prev.map((row, i) => (i === index
      ? {
        ...row,
        organization,
        ror_id: rorId,
        ...(country ? { country } : {}),
        department: '',
        group: '',
        deptOptions: [],
        groupOptions: [],
        // Picked from a dropdown = an existing org, so nothing on this row is pending.
        pendingFields: [],
      }
      : row)));

    if (organization) clearFieldError(index, 'organization');
    else setInputError((prev) => ({ ...prev, [index]: { ...prev[index], organization: true } }));

    loadRowDeptOptions(index, organization, rorId);
  };

  const handleCreateOrUpdateAffiliation = (index) => {
    const row = affiliations[index];
    const payload = {
      id: row.id,
      country: row.country,
      organization: row.organization,
      department: row.department,
      group: row.group,
      ror_id: row.ror_id,
      from: row.from || '',
      to: row.to || '',
    };
    const callFunction = row.id
      ? UserSettingsFetcher.updateAffiliation
      : UserSettingsFetcher.createAffiliation;

    callFunction(payload)
      .then((result) => {
        if (result && result.error) {
          NotificationActions.add({
            title: 'Affiliation not saved',
            message: result.error,
            level: 'error',
            position: 'tc',
            dismissible: 'button',
            autoDismiss: 5,
          });
          // Keep the row open with the user's input so they can fix and retry.
          setAffiliations((prev) => prev.map((r, i) => (i === index ? { ...r, disabled: false } : r)));
          return;
        }
        getAllAffiliations();
      })
      .catch((error) => {
        console.error(error);
      });
  };

  const handleDeleteAffiliation = (index) => {
    const { id } = affiliations[index];
    if (id) {
      UserSettingsFetcher.deleteAffiliation(id)
        .then((result) => {
          if (result && result.error) {
            console.error(result.error);
            return false;
          }
          getAllAffiliations();
          return true;
        });
    } else {
      setAffiliations((prev) => prev.filter((_, i) => i !== index));
    }
  };

  const onChangeHandler = (index, field, value) => {
    setAffiliations((prev) => prev.map((row, i) => {
      if (i !== index) return row;
      const updated = { ...row, [field]: value };
      if (field === 'department') updated.group = '';
      // Choosing from a dropdown means this field is an existing value, not a suggestion.
      if (row.pendingFields) updated.pendingFields = row.pendingFields.filter((f) => f !== field);
      return updated;
    }));

    if (field === 'department') {
      const row = affiliations[index];
      loadRowGroupOptions(index, row.organization, value, row.ror_id);
    }
    clearFieldError(index, field);
  };

  const submitSuggestion = (params, onDone) => {
    UserSettingsFetcher.createSuggestion(params)
      .then((result) => {
        if (result && result.error) {
          NotificationActions.add({
            title: 'Request not submitted',
            message: result.error,
            level: 'error',
            position: 'tc',
            dismissible: 'button',
            autoDismiss: 5,
          });
          return;
        }
        // Batch both updates into one render cycle — avoids dequal stack overflow
        // in OverlayTrigger when Promise callbacks trigger separate re-renders (React 17).
        ReactDOM.unstable_batchedUpdates(() => {
          onDone();
          setAffiliations((prev) => prev.filter((a) => a.id));
        });
        NotificationActions.add({
          title: 'Affiliation request submitted',
          message: 'Your affiliation will be added once an admin approves it.',
          level: 'info',
          position: 'tc',
          dismissible: 'button',
          autoDismiss: 5,
        });
        UserSettingsFetcher.getPendingSuggestions().then((data) => setPendingSuggestions(data || []));
      })
      .catch(() => {
        NotificationActions.add({
          title: 'Submission failed',
          message: 'Your request could not be submitted. Please try again.',
          level: 'error',
          position: 'tc',
          dismissible: 'button',
          autoDismiss: 5,
        });
      });
  };

  const handleSaveButtonClick = (index) => {
    const updatedAffiliations = [...affiliations];
    const newInputErrors = { ...inputError };

    if (!updatedAffiliations[index].organization) {
      newInputErrors[index] = { ...newInputErrors[index], organization: true };
      setInputError(newInputErrors);
      return;
    }

    if (newInputErrors[index] && Object.keys(newInputErrors[index]).length) return;

    const row = updatedAffiliations[index];
    if (row.pendingFields && row.pendingFields.length > 0) {
      // Any pending (newly suggested) value sends the whole row to admin review.
      const payload = {
        organization: row.organization,
        country: row.country || '',
        department: row.department || '',
        group: row.group || '',
        from: row.from || '',
        to: row.to || '',
        ...(row.ror_id ? { ror_id: row.ror_id } : {}),
        ...(row.id ? { target_user_affiliation_id: row.id } : {}),
      };
      submitSuggestion(payload, () => getAllAffiliations());
      return;
    }

    updatedAffiliations[index].disabled = true;
    setAffiliations(updatedAffiliations);
    handleCreateOrUpdateAffiliation(index);
  };

  const closeSuggestionPopover = () => setSuggestionPopover({ field: null, value: '' });

  const activeRowWithOrg = affiliations.find((a) => !a.disabled && a.organization);

  const handleSuggestionSubmit = () => {
    const { field, value } = suggestionPopover;
    if (!value.trim()) return;

    // Client-side dedup: block if a matching pending suggestion already exists (case-insensitive)
    const norm = (v) => (v || '').trim().toLowerCase();
    const alreadyPending = pendingSuggestions.some((s) => {
      if (field === 'organization') return norm(s.organization) === norm(value);
      const sameOrg = norm(s.organization) === norm(activeRowWithOrg ? activeRowWithOrg.organization : '');
      return norm(s[field]) === norm(value) && sameOrg;
    });

    // Check against the active row's already-loaded registry options (dept/group dropdowns)
    const rowOptions = activeRowWithOrg || {};
    let registryOptions = [];
    if (field === 'department') registryOptions = rowOptions.deptOptions || [];
    else if (field === 'group') registryOptions = rowOptions.groupOptions || [];
    const alreadyInRegistry = registryOptions.some((opt) => norm(opt.value) === norm(value));

    if (alreadyPending || alreadyInRegistry) {
      NotificationActions.add({
        title: alreadyInRegistry ? 'Already in registry' : 'Already pending',
        message: alreadyInRegistry
          ? `"${value.trim()}" already exists. Select it from the dropdown instead.`
          : `A pending suggestion for this ${field} already exists.`,
        level: 'warning',
        position: 'tc',
        dismissible: 'button',
        autoDismiss: 5,
      });
      closeSuggestionPopover();
      return;
    }

    // Stage the value into a row as a pending field; submission happens on Save.
    const trimmed = value.trim();
    const addPending = (row) => Array.from(new Set([...(row.pendingFields || []), field]));

    if (field === 'organization') {
      // Org has no required active row: stage into the open editable row, or open a new one.
      const openIndex = affiliations.findIndex((a) => !a.disabled);
      setAffiliations((prev) => {
        const idx = prev.findIndex((a) => !a.disabled);
        if (idx === -1) {
          return [
            ...prev.map((r) => ({ ...r, disabled: true })),
            {
              country: '',
              organization: trimmed,
              ror_id: '',
              department: '',
              group: '',
              disabled: false,
              pendingFields: ['organization'],
            },
          ];
        }
        return prev.map((r, i) => (i === idx
          ? {
            ...r,
            organization: trimmed,
            ror_id: '',
            pendingFields: addPending(r),
          }
          : r));
      });
      if (openIndex !== -1) clearFieldError(openIndex, 'organization');
      closeSuggestionPopover();
      return;
    }

    // Department/group: the trigger is disabled unless an editable row already has an org.
    const targetIndex = affiliations.findIndex((a) => !a.disabled && a.organization);
    if (targetIndex === -1) { closeSuggestionPopover(); return; }
    setAffiliations((prev) => prev.map((row, i) => (i === targetIndex
      ? { ...row, [field]: trimmed, pendingFields: addPending(row) }
      : row)));
    closeSuggestionPopover();
  };

  // requiresOrg=false for organization suggestions (no active row needed)
  const renderSuggestionTrigger = (field, label) => {
    const activeRow = affiliations.find((a) => !a.disabled);
    // Org suggestions need an open row with a country (an org belongs to a country,
    // and ROR matches by country); department/group need a row that already has an org.
    const disabled = field === 'organization'
      ? (!activeRow || !activeRow.country)
      : !activeRowWithOrg;
    const disabledHint = field === 'organization'
      ? 'Add a row and select a country first'
      : 'Select an organization first';
    const isOpen = suggestionPopover.field === field;
    const triggerRef = suggestionTriggerRefs[field];

    const btn = disabled ? (
      <OverlayTrigger
        placement="top"
        overlay={<Tooltip id={`suggest-${field}-disabled`}>{disabledHint}</Tooltip>}
      >
        <span className="ms-1">
          <Button size="sm" variant="link" className="p-0" disabled style={{ pointerEvents: 'none' }}>
            <i className="fa fa-plus" />
          </Button>
        </span>
      </OverlayTrigger>
    ) : (
      <Button
        ref={triggerRef}
        size="sm"
        variant="link"
        className="p-0 ms-1"
        onClick={() => (isOpen
          ? closeSuggestionPopover()
          : setSuggestionPopover({ field, value: '' }))}
      >
        <i className="fa fa-plus" />
      </Button>
    );

    return (
      <>
        {btn}
        {!disabled && (
          <Overlay
            target={triggerRef}
            show={isOpen}
            placement="bottom"
            rootClose
            onHide={closeSuggestionPopover}
          >
            <Popover
              id={`suggestion-popover-${field}`}
              style={{ minWidth: field === 'organization' ? '300px' : '220px' }}
            >
              <Popover.Body>
                <div className="mb-3">
                  {/* eslint-disable-next-line jsx-a11y/label-has-associated-control */}
                  <label className="form-label form-label-sm">{label}</label>
                  <input
                    className="form-control form-control-sm"
                    value={suggestionPopover.value}
                    onChange={(e) => setSuggestionPopover((p) => ({ ...p, value: e.target.value }))}
                  />
                </div>
                {field === 'organization' && orgHints.length > 0 && (
                  <div
                    className="mb-3 p-2 bg-light rounded border border-secondary-subtle"
                    style={{ fontSize: '0.8rem' }}
                  >
                    <div className="fw-semibold mb-1">
                      <i className="fa fa-info-circle me-1" />
                      Possible matches in ROR — pick one from the dropdown if it fits:
                    </div>
                    {orgHints.map((h) => (
                      <div key={h.value} className="text-truncate text-secondary">
                        {h.label}
                        {h.country && <span className="ms-1 text-muted">{` (${h.country})`}</span>}
                      </div>
                    ))}
                  </div>
                )}
                <div className="d-flex justify-content-end gap-2">
                  <Button size="sm" variant="light" onClick={closeSuggestionPopover}>Cancel</Button>
                  <Button
                    size="sm"
                    variant="primary"
                    disabled={!suggestionPopover.value.trim()}
                    onClick={handleSuggestionSubmit}
                  >
                    Confirm
                  </Button>
                </div>
              </Popover.Body>
            </Popover>
          </Overlay>
        )}
      </>
    );
  };

  const popover = (index) => (
    <Popover id={`delete-confirm-${index}`}>
      <Popover.Header as="h3">Delete Confirmation</Popover.Header>
      <Popover.Body>
        Are you sure you want to delete this affiliation?
        <div className="mt-2 d-flex justify-content-center">
          <Button
            variant="danger"
            size="sm"
            onClick={() => {
              handleDeleteAffiliation(index);
              setShowConfirmIndex(null);
            }}
          >
            Yes
          </Button>
          <Button
            variant="secondary"
            size="sm"
            className="ms-2"
            onClick={() => setShowConfirmIndex(null)}
          >
            No
          </Button>
        </div>
      </Popover.Body>
    </Popover>
  );

  return (
    <div>
      <div className="d-flex align-items-center justify-content-between mb-1">
        <h3 className="mb-0">My affiliations</h3>
        <Button size="sm" variant="outline-secondary" onClick={() => { getAllAffiliations(); refreshSuggestions(); }}>
          <i className="fa fa-refresh me-1" />
          Refresh
        </Button>
      </div>
      <div className="d-flex flex-nowrap gap-2 overflow-auto pb-2">
        {savedEntries.map((entry) => (
          <div
            key={entry.id}
            className="position-relative border border-gray-300 rounded-2 p-2 shadow-sm flex-shrink-0"
            style={{ minWidth: '250px', maxWidth: '300px' }}
          >
            <span
              className={`badge position-absolute top-0 end-0 m-2 ${isPast(entry) ? 'bg-secondary' : 'bg-success'}`}
            >
              {isPast(entry) ? 'Past' : 'Current'}
            </span>
            <p>
              <strong className="me-1">Country:</strong>
              {entry.country || '—'}
            </p>
            <p>
              <strong className="me-1">Organization:</strong>
              {entry.organization}
              {rorLink(entry.ror_id)}
            </p>
            <p>
              <strong className="me-1">Department:</strong>
              {entry.department || '—'}
            </p>
            <p>
              <strong className="me-1">Group:</strong>
              {entry.group || '—'}
            </p>
            {(entry.from || entry.to) && (
              <p>
                <strong className="me-1">Period:</strong>
                {`${displayDate(entry.from) || '…'} – ${displayDate(entry.to) || 'present'}`}
              </p>
            )}
          </div>
        ))}
        {pendingSuggestions.map((s) => (
          <div
            key={`suggestion-${s.id}`}
            className="position-relative border border-warning rounded-2 p-2 shadow-sm flex-shrink-0"
            style={{ minWidth: '250px', maxWidth: '300px' }}
          >
            <span className="badge position-absolute top-0 end-0 m-2 bg-warning text-dark">In Review</span>
            <p>
              <strong className="me-1">Country:</strong>
              {s.country || '—'}
            </p>
            <p>
              <strong className="me-1">Organization:</strong>
              {s.organization || '—'}
            </p>
            <p>
              <strong className="me-1">Department:</strong>
              {s.department || '—'}
            </p>
            <p>
              <strong className="me-1">Group:</strong>
              {s.group || '—'}
            </p>
            {(s.from || s.to) && (
              <p>
                <strong className="me-1">Period:</strong>
                {`${displayDate(s.from) || '…'} – ${displayDate(s.to) || 'present'}`}
              </p>
            )}
            <Button
              size="sm"
              variant="outline-danger"
              onClick={() => UserSettingsFetcher.deleteSuggestion(s.id).then(() => refreshSuggestions())}
            >
              Withdraw
            </Button>
          </div>
        ))}
      </div>

      <div className="d-flex justify-content-end my-1">
        <Button
          disabled={affiliations.some((item) => !item.id)}
          variant="primary"
          onClick={() => {
            // Only one row is editable at a time: lock all existing rows, open the new one.
            setAffiliations((prev) => [
              ...prev.map((r) => ({ ...r, disabled: true })),
              {
                country: '',
                organization: '',
                department: '',
                group: '',
                disabled: false,
              },
            ]);
          }}
        >
          Add affiliation
          <i className="fa fa-plus ms-1" />
        </Button>
      </div>
      <Table striped bordered hover style={{ tableLayout: 'fixed' }}>
        <colgroup>
          <col style={{ width: '15%' }} />
          <col style={{ width: '24%' }} />
          <col style={{ width: '16%' }} />
          <col style={{ width: '16%' }} />
          <col style={{ width: '11%' }} />
          <col style={{ width: '11%' }} />
          <col style={{ width: '7%' }} />
        </colgroup>
        <thead>
          <tr>
            <th>Country</th>
            <th>
              Organization
              <span className="text-danger ms-1">*</span>
              {renderSuggestionTrigger('organization', 'Organization name')}
            </th>
            <th>
              Department
              {renderSuggestionTrigger('department', 'Department name')}
            </th>
            <th>
              Working Group
              {renderSuggestionTrigger('group', 'Working group name')}
            </th>
            <th>From</th>
            <th>To</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {affiliations.map((item, index) => (
            <tr key={item.id || `new-${index}`}>
              <td>
                {item.disabled ? (item.country || '—')
                  : (
                    <Select
                      isClearable
                      placeholder="Select country"
                      options={countryOptions}
                      value={countryOptions.find((option) => option.value === item.country) || null}
                      onChange={(choice) => onChangeHandler(index, 'country', choice ? choice.value : '')}
                    />
                  )}
              </td>
              <td>
                {item.disabled ? (
                  <>
                    {item.organization}
                    {rorLink(item.ror_id)}
                  </>
                ) : (
                  <>
                    <OrganizationSelect
                      value={item.organization
                        ? { value: item.ror_id || item.organization, label: item.organization }
                        : null}
                      isInvalid={!!(inputError[index] && inputError[index].organization)}
                      country={item.country || ''}
                      onChange={(choice) => handleOrganizationChange(index, choice)}
                    />
                    {(item.pendingFields || []).includes('organization') && (
                      <small className="text-warning d-block">New — pending admin approval on Save</small>
                    )}
                  </>
                )}
              </td>
              <td>
                {item.disabled ? (item.department || '—')
                  : (
                    <>
                      <AffiliationSelect
                        placeholder="Select department"
                        value={item.department || ''}
                        options={item.deptOptions || []}
                        disabled={!item.organization}
                        onChange={(val) => onChangeHandler(index, 'department', val)}
                      />
                      {(item.pendingFields || []).includes('department') && (
                        <small className="text-warning d-block">New — pending admin approval on Save</small>
                      )}
                    </>
                  )}
              </td>
              <td>
                {item.disabled ? (item.group || '—')
                  : (
                    <>
                      <AffiliationSelect
                        placeholder="Select working group"
                        value={item.group || ''}
                        options={item.groupOptions || []}
                        disabled={!item.organization}
                        onChange={(val) => onChangeHandler(index, 'group', val)}
                      />
                      {(item.pendingFields || []).includes('group') && (
                        <small className="text-warning d-block">New — pending admin approval on Save</small>
                      )}
                    </>
                  )}
              </td>
              <td>
                {item.disabled ? (displayDate(item.from) || '—')
                  : (
                    <DatePicker
                      selected={parseDateValue(item.from)}
                      onChange={(date) => onChangeHandler(index, 'from', formatDateValue(date))}
                      isClearable
                      placeholderText="MM/DD/YYYY"
                      dateFormat="MM/dd/yyyy"
                      wrapperClassName="w-100"
                    />
                  )}
              </td>
              <td>
                {item.disabled ? (displayDate(item.to) || '—')
                  : (
                    <DatePicker
                      selected={parseDateValue(item.to)}
                      onChange={(date) => onChangeHandler(index, 'to', formatDateValue(date))}
                      isClearable
                      placeholderText="MM/DD/YYYY"
                      dateFormat="MM/dd/yyyy"
                      wrapperClassName="w-100"
                    />
                  )}
              </td>
              <td>
                <div className="d-flex justify-content-end">
                  {item.disabled
                    ? (
                      <OverlayTrigger
                        placement="top"
                        overlay={(
                          <Tooltip id="affiliation_edit_tooltip">
                            Edit affiliation
                          </Tooltip>
                        )}
                      >
                        <Button
                          size="sm"
                          variant="primary"
                          className="ms-auto"
                          onClick={() => {
                            // Single-row editing: open this row, lock every other one.
                            setAffiliations((prev) => prev.map((r, i) => ({ ...r, disabled: i !== index })));
                            // Editing doesn't fire the org onChange, so load the
                            // org-scoped department/group options for this row.
                            loadRowDeptOptions(index, item.organization, item.ror_id);
                            loadRowGroupOptions(index, item.organization, item.department, item.ror_id);
                          }}
                        >
                          <i className="fa fa-edit" title="Edit affiliation" />
                        </Button>
                      </OverlayTrigger>
                    )
                    : (
                      <OverlayTrigger
                        placement="top"
                        overlay={(
                          <Tooltip id="affiliation_save_tooltip">
                            Save changes
                          </Tooltip>
                        )}
                      >
                        <Button
                          size="sm"
                          variant="warning"
                          className="ms-auto"
                          onClick={() => handleSaveButtonClick(index)}
                        >
                          <i className="fa fa-save" title="Save changes" />
                        </Button>
                      </OverlayTrigger>
                    )}
                  <OverlayTrigger
                    trigger="click"
                    placement="left"
                    show={showConfirmIndex === index}
                    onToggle={(isOpen) => setShowConfirmIndex(isOpen ? index : null)}
                    overlay={popover(index)}
                  >
                    <Button
                      className="ms-1"
                      size="sm"
                      variant="danger"
                      onClick={() => setShowConfirmIndex(index)}
                    >
                      <i className="fa fa-trash-o" title="Delete affiliation" />
                    </Button>
                  </OverlayTrigger>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </Table>

    </div>
  );
}

export default Affiliations;
