import React, { useState, useEffect } from 'react';
import {
  Table, Button, Badge, Form, Alert
} from 'react-bootstrap';
import AppModal from 'src/components/common/AppModal';
import { Select, CreatableSelect } from 'src/components/common/Select';
import OrganizationSelect from 'src/components/affiliation/OrganizationSelect';
import AdminFetcher from 'src/fetchers/AdminFetcher';
import UserSettingsFetcher from 'src/fetchers/UserSettingsFetcher';

const AffiliationSuggestions = () => {
  const [suggestions, setSuggestions] = useState([]);
  const [statusFilter, setStatusFilter] = useState('pending');
  const [countryOptions, setCountryOptions] = useState([]);
  const [deptOptions, setDeptOptions] = useState([]);
  const [groupOptions, setGroupOptions] = useState([]);
  const [editSug, setEditSug] = useState(null);
  const [actionError, setActionError] = useState(null);

  const load = (status) => {
    AdminFetcher.fetchAffiliationSuggestions(status)
      .then((data) => setSuggestions(data || []));
  };

  useEffect(() => { load(statusFilter); }, [statusFilter]);

  useEffect(() => {
    UserSettingsFetcher.getAutoCompleteSuggestions('countries')
      .then((data) => setCountryOptions((data || []).map((c) => ({ value: c.value, label: c.label }))));
  }, []);

  // Department/working-group options scoped to the organization being approved.
  // Fields are disabled without an org, so stale options are never shown.
  useEffect(() => {
    const org = editSug?.organization;
    if (!org) return;
    UserSettingsFetcher.getAutoCompleteSuggestions('departments', org, '', editSug.ror_id || '')
      .then((data) => setDeptOptions(data || []));
  }, [editSug?.organization, editSug?.ror_id]);

  useEffect(() => {
    const org = editSug?.organization;
    if (!org) return;
    UserSettingsFetcher.getAutoCompleteSuggestions('groups', org, editSug.department || '', editSug.ror_id || '')
      .then((data) => setGroupOptions(data || []));
  }, [editSug?.organization, editSug?.department, editSug?.ror_id]);

  const handleAction = (id, action, body = {}) => {
    AdminFetcher.updateAffiliationSuggestion(id, action, body)
      .then((result) => {
        setActionError(result && result.error ? result.error : null);
        setEditSug(null);
        load(statusFilter);
      });
  };

  const setEditField = (patch) => setEditSug((prev) => ({ ...prev, ...patch }));

  const handleOrgChange = (choice) => {
    const organization = choice ? choice.label : '';
    const rorId = choice && choice.value && choice.value !== choice.label ? choice.value : '';
    setEditField({
      organization,
      ror_id: rorId,
      ...(choice && choice.country ? { country: choice.country } : {}),
    });
  };

  const statusBadge = (status) => {
    const map = { pending: 'warning', approved: 'success', rejected: 'danger' };
    return <Badge bg={map[status] || 'secondary'}>{status}</Badge>;
  };

  return (
    <div className="p-3">
      <h4>Affiliation Suggestions</h4>
      {actionError && (
        <Alert variant="danger" dismissible onClose={() => setActionError(null)}>
          {actionError}
        </Alert>
      )}
      <div className="mb-3 d-flex gap-2">
        {['pending', 'approved', 'rejected'].map((s) => (
          <Button
            key={s}
            size="sm"
            variant={statusFilter === s ? 'primary' : 'outline-secondary'}
            onClick={() => setStatusFilter(s)}
          >
            {s.charAt(0).toUpperCase() + s.slice(1)}
          </Button>
        ))}
      </div>

      <Table striped bordered hover size="sm">
        <thead>
          <tr>
            <th>User</th>
            <th>Organization</th>
            <th>Department</th>
            <th>Working Group</th>
            <th>Country</th>
            <th>Submitted</th>
            <th>Status</th>
            {statusFilter === 'pending' && <th>Actions</th>}
          </tr>
        </thead>
        <tbody>
          {suggestions.map((s) => (
            <tr key={s.id}>
              <td>
                {s.user?.name}
                {' '}
                <small className="text-muted">
                  (
                  {s.user?.email}
                  )
                </small>
              </td>
              <td>{s.organization}</td>
              <td>{s.department || '—'}</td>
              <td>{s.group || '—'}</td>
              <td>{s.country || '—'}</td>
              <td>{new Date(s.created_at).toLocaleDateString()}</td>
              <td>{statusBadge(s.status)}</td>
              {statusFilter === 'pending' && (
                <td>
                  <Button size="sm" variant="outline-secondary" className="me-1" onClick={() => setEditSug({ ...s })}>
                    Edit
                  </Button>
                  <Button size="sm" variant="success" className="me-1" onClick={() => handleAction(s.id, 'approve')}>
                    Approve
                  </Button>
                  <Button size="sm" variant="danger" onClick={() => handleAction(s.id, 'reject')}>
                    Reject
                  </Button>
                </td>
              )}
            </tr>
          ))}
          {suggestions.length === 0 && (
            <tr>
              <td colSpan={statusFilter === 'pending' ? 8 : 7} className="text-center text-muted">
                {`No ${statusFilter} suggestions`}
              </td>
            </tr>
          )}
        </tbody>
      </Table>

      <AppModal
        show={!!editSug}
        onHide={() => setEditSug(null)}
        title="Edit & approve request"
        primaryActionLabel="Approve"
        onPrimaryAction={() => editSug && handleAction(editSug.id, 'approve', {
          organization: editSug.organization || '',
          department: editSug.department || '',
          group: editSug.group || '',
          country: editSug.country || '',
          ...(editSug.ror_id ? { ror_id: editSug.ror_id } : {}),
        })}
      >
        {editSug && (
          <div className="d-flex flex-column gap-3">
            <Form.Group>
              <Form.Label>Country</Form.Label>
              <Select
                isClearable
                placeholder="Select country"
                options={countryOptions}
                value={countryOptions.find((o) => o.value === editSug.country) || null}
                onChange={(c) => setEditField({ country: c ? c.value : '' })}
              />
            </Form.Group>
            <Form.Group>
              <Form.Label>Organization</Form.Label>
              <OrganizationSelect
                value={editSug.organization
                  ? { value: editSug.ror_id || editSug.organization, label: editSug.organization }
                  : null}
                country={editSug.country || ''}
                onChange={handleOrgChange}
              />
            </Form.Group>
            <Form.Group>
              <Form.Label>Department</Form.Label>
              <CreatableSelect
                isClearable
                isDisabled={!editSug.organization}
                placeholder="Select or add a department"
                options={deptOptions}
                value={editSug.department ? { value: editSug.department, label: editSug.department } : null}
                onChange={(o) => setEditField({ department: o ? o.value : '' })}
                onCreateOption={(v) => setEditField({ department: v })}
              />
            </Form.Group>
            <Form.Group>
              <Form.Label>Working group</Form.Label>
              <CreatableSelect
                isClearable
                isDisabled={!editSug.organization}
                placeholder="Select or add a working group"
                options={groupOptions}
                value={editSug.group ? { value: editSug.group, label: editSug.group } : null}
                onChange={(o) => setEditField({ group: o ? o.value : '' })}
                onCreateOption={(v) => setEditField({ group: v })}
              />
            </Form.Group>
          </div>
        )}
      </AppModal>
    </div>
  );
};

export default AffiliationSuggestions;
