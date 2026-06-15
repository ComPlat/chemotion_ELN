import React, { useState, useEffect, useRef } from 'react';
import ReactDOM from 'react-dom';
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
  const [deptOptions, setDeptOptions] = useState([]);
  const [groupOptions, setGroupOptions] = useState([]);
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
    Promise.all([
      UserSettingsFetcher.getPendingSuggestions(),
      UserSettingsFetcher.getSuggestionsByStatus('rejected'),
    ]).then(([pending, rejected]) => {
      const freshPending = pending || [];
      const freshRejected = rejected || [];

      setPendingSuggestions((prev) => {
        const resolved = prev.filter((p) => !freshPending.find((f) => f.id === p.id));
        const nowRejected = resolved.filter((p) => freshRejected.find((r) => r.id === p.id));

        if (resolved.length > 0) getAllAffiliations();

        if (nowRejected.length > 0) {
          NotificationActions.add({
            title: 'Affiliation request rejected',
            message: 'An admin has rejected one of your affiliation requests. Please review and resubmit.',
            level: 'warning',
            position: 'tc',
            dismissible: 'button',
            autoDismiss: 8,
          });
        }

        return freshPending;
      });
    });
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
  // Only fires for 4+ char queries; filters to results whose label contains the query
  // to avoid false positives from ROR's substring matching on short terms.
  useEffect(() => {
    const query = suggestionPopover.value.trim();
    if (suggestionPopover.field !== 'organization' || query.length < 4) {
      setOrgHints([]);
      return undefined;
    }
    const timer = setTimeout(() => {
      UserSettingsFetcher.searchRorOrganizations(query)
        .then((results) => {
          const q = query.toLowerCase();
          const relevant = results.filter((r) => r.label.toLowerCase().includes(q));
          setOrgHints(relevant.slice(0, 5));
        });
    }, 400);
    return () => clearTimeout(timer);
  }, [suggestionPopover.value, suggestionPopover.field]);

  const reloadDeptOptions = (org) => {
    if (!org) { setDeptOptions([]); return; }
    UserSettingsFetcher.getAutoCompleteSuggestions('departments', org)
      .then((data) => setDeptOptions(data || []));
  };

  const reloadGroupOptions = (org, dept) => {
    if (!org) { setGroupOptions([]); return; }
    UserSettingsFetcher.getAutoCompleteSuggestions('groups', org, dept)
      .then((data) => setGroupOptions(data || []));
  };

  const handleCreateOrUpdateAffiliation = (index) => {
    const params = affiliations[index];
    const callFunction = params.id
      ? UserSettingsFetcher.updateAffiliation
      : UserSettingsFetcher.createAffiliation;

    callFunction(params)
      .then(() => getAllAffiliations())
      .catch((error) => {
        console.error(error);
      });
  };

  const handleDeleteAffiliation = (index) => {
    const { id } = affiliations[index];
    if (id) {
      UserSettingsFetcher.deleteAffiliation(id)
        .then((result) => {
          if (result.error) {
            console.error(result.error);
            return false;
          }
          getAllAffiliations();
          return true;
        });
    } else {
      affiliations.splice(index, 1);
      setAffiliations(affiliations);
    }
  };

  const onChangeHandler = (index, field, value) => {
    const updatedAffiliations = [...affiliations];
    updatedAffiliations[index][field] = value;
    const newInputErrors = { ...inputError };

    if (field === 'organization') {
      updatedAffiliations[index].department = '';
      updatedAffiliations[index].group = '';
      reloadDeptOptions(value);
      setGroupOptions([]);
      if (!value) {
        newInputErrors[index] = { ...newInputErrors[index], organization: true };
      } else if (newInputErrors[index]) {
        delete newInputErrors[index].organization;
        if (Object.keys(newInputErrors[index]).length === 0) {
          delete newInputErrors[index];
        }
      }
    } else if (field === 'department') {
      updatedAffiliations[index].group = '';
      reloadGroupOptions(updatedAffiliations[index].organization, value);
    } else if (newInputErrors[index]) {
      delete newInputErrors[index][field];
      if (Object.keys(newInputErrors[index]).length === 0) {
        delete newInputErrors[index];
      }
    }

    setInputError(newInputErrors);
    setAffiliations(updatedAffiliations);
  };

  const handleSaveButtonClick = (index) => {
    const updatedAffiliations = [...affiliations];
    const newInputErrors = { ...inputError };

    if (!updatedAffiliations[index].organization) {
      newInputErrors[index] = { ...newInputErrors[index], organization: true };
      setInputError(newInputErrors);
      return;
    }

    if (!newInputErrors[index] || !Object.keys(newInputErrors[index]).length) {
      updatedAffiliations[index].disabled = true;
      setAffiliations(updatedAffiliations);
      handleCreateOrUpdateAffiliation(index);
    }
  };

  const submitSuggestion = (params, onDone) => {
    UserSettingsFetcher.createSuggestion(params)
      .then(() => {
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

    // Check against the already-loaded registry options (dept/group dropdowns)
    const registryOptions = field === 'department' ? deptOptions : field === 'group' ? groupOptions : [];
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

    const context = field !== 'organization' && activeRowWithOrg
      ? { organization: activeRowWithOrg.organization, country: activeRowWithOrg.country || '' }
      : {};
    submitSuggestion({ [field]: value.trim(), ...context }, closeSuggestionPopover);
  };

  // requiresOrg=false for organization suggestions (no active row needed)
  const renderSuggestionTrigger = (field, label, requiresOrg = true) => {
    const disabled = requiresOrg && !activeRowWithOrg;
    const isOpen = suggestionPopover.field === field;
    const triggerRef = suggestionTriggerRefs[field];

    const btn = disabled ? (
      <OverlayTrigger
        placement="top"
        overlay={<Tooltip id={`suggest-${field}-disabled`}>Select an organization first</Tooltip>}
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
            <Popover id={`suggestion-popover-${field}`} style={{ minWidth: field === 'organization' ? '300px' : '220px' }}>
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
                  <div className="mb-3 p-2 bg-warning bg-opacity-25 rounded border border-warning" style={{ fontSize: '0.8rem' }}>
                    <div className="fw-semibold mb-1">
                      <i className="fa fa-exclamation-triangle me-1" />
                      Already in ROR — select from the dropdown:
                    </div>
                    {orgHints.map((h) => (
                      <div key={h.value} className="text-truncate text-secondary">
                        {h.label}
                        {h.country && <span className="ms-1 text-muted">({h.country})</span>}
                      </div>
                    ))}
                  </div>
                )}
                <div className="d-flex justify-content-end gap-2">
                  <Button size="sm" variant="light" onClick={closeSuggestionPopover}>Cancel</Button>
                  <Button
                    size="sm"
                    variant="primary"
                    disabled={!suggestionPopover.value.trim() || (field === 'organization' && orgHints.length > 0)}
                    style={(field === 'organization' && orgHints.length > 0) ? { pointerEvents: 'none', opacity: 0.5 } : {}}
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
            <span className="badge position-absolute top-0 end-0 m-2 bg-success">Current</span>
            <p>
              <strong className="me-1">Country:</strong>
              {entry.country}
            </p>
            <p>
              <strong className="me-1">Organization:</strong>
              {entry.organization}
            </p>
            <p>
              <strong className="me-1">Department:</strong>
              {entry.department}
            </p>
            <p>
              <strong className="me-1">Group:</strong>
              {entry.group}
            </p>
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
          </div>
        ))}
      </div>

      <div className="d-flex justify-content-end my-1">
        <Button
          disabled={affiliations.some((item) => !item.id)}
          variant="primary"
          onClick={() => {
            setAffiliations((prev) => [...prev, {
              country: '',
              organization: '',
              department: '',
              group: '',
              disabled: false,
            }]);
          }}
        >
          Add affiliation
          <i className="fa fa-plus ms-1" />
        </Button>
      </div>
      <Table striped bordered hover style={{ tableLayout: 'fixed' }}>
        <colgroup>
          <col style={{ width: '20%' }} />
          <col style={{ width: '20%' }} />
          <col style={{ width: '15%' }} />
          <col style={{ width: '15%' }} />
          <col style={{ width: '12%' }} />
          <col style={{ width: '12%' }} />
          <col style={{ width: '6%' }} />
        </colgroup>
        <thead>
          <tr>
            <th style={{ width: '16%' }}>Country</th>
            <th style={{ width: '24%' }}>
              Organization
              <span className="text-danger ms-1">*</span>
              {renderSuggestionTrigger('organization', 'Organization name', false)}
            </th>
            <th style={{ width: '22%' }}>
              Department
              {renderSuggestionTrigger('department', 'Department name')}
            </th>
            <th style={{ width: '22%' }}>
              Working Group
              {renderSuggestionTrigger('group', 'Working group name')}
            </th>
            <th style={{ width: '16%' }}>Actions</th>
          </tr>
        </thead>
        <tbody>
          {affiliations.map((item, index) => (
            <tr key={item.id}>
              <td>
                {item.disabled ? item.country
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
                {item.disabled ? item.organization
                  : (
                    <OrganizationSelect
                      value={item.organization ? { value: item.organization, label: item.organization } : null}
                      isInvalid={!!(inputError[index] && inputError[index].organization)}
                      country={item.country || ''}
                      onChange={(choice) => {
                        onChangeHandler(index, 'organization', choice ? choice.label : '');
                        if (choice && choice.country) onChangeHandler(index, 'country', choice.country);
                      }}
                    />
                  )}
              </td>
              <td>
                {item.disabled ? item.department
                  : (
                    <AffiliationSelect
                      placeholder="Select department"
                      value={item.department || ''}
                      options={deptOptions}
                      disabled={!item.organization}
                      onChange={(val) => onChangeHandler(index, 'department', val)}
                    />
                  )}
              </td>
              <td>
                {item.disabled ? item.group
                  : (
                    <AffiliationSelect
                      placeholder="Select working group"
                      value={item.group || ''}
                      options={groupOptions}
                      disabled={!item.organization}
                      onChange={(val) => onChangeHandler(index, 'group', val)}
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
                            const updatedAffiliations = [...affiliations];
                            updatedAffiliations[index].disabled = false;
                            setAffiliations(updatedAffiliations);
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
