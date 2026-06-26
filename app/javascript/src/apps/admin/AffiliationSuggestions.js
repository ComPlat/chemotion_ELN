import React, { useState, useEffect } from 'react';
import { Table, Button, Badge } from 'react-bootstrap';
import AdminFetcher from 'src/fetchers/AdminFetcher';

export default function AffiliationSuggestions() {
  const [suggestions, setSuggestions] = useState([]);
  const [statusFilter, setStatusFilter] = useState('pending');

  const load = (status) => {
    AdminFetcher.fetchAffiliationSuggestions(status)
      .then((data) => setSuggestions(data || []));
  };

  useEffect(() => { load(statusFilter); }, [statusFilter]);

  const handleAction = (id, action) => {
    AdminFetcher.updateAffiliationSuggestion(id, action)
      .then(() => load(statusFilter));
  };

  const statusBadge = (status) => {
    const map = { pending: 'warning', approved: 'success', rejected: 'danger' };
    return <Badge bg={map[status] || 'secondary'}>{status}</Badge>;
  };

  return (
    <div className="p-3">
      <h4>Affiliation Suggestions</h4>
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
    </div>
  );
}
