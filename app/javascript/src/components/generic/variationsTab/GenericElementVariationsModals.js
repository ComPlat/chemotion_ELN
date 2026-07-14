import React, { useState, useEffect } from 'react';
import PropTypes from 'prop-types';
import {
  Modal, Button, Form, ListGroup, Badge,
} from 'react-bootstrap';

export function RemoveAllModal({ show, onConfirm, onCancel }) {
  return (
    <Modal show={show} onHide={onCancel}>
      <Modal.Header closeButton>
        <Modal.Title>Remove all variations?</Modal.Title>
      </Modal.Header>
      <Modal.Body>
        This will delete every variation row for this element. This cannot be undone
        without reverting your changes.
      </Modal.Body>
      <Modal.Footer>
        <Button variant="secondary" onClick={onCancel}>Cancel</Button>
        <Button variant="danger" onClick={onConfirm}>Remove all</Button>
      </Modal.Footer>
    </Modal>
  );
}
RemoveAllModal.propTypes = {
  show: PropTypes.bool.isRequired,
  onConfirm: PropTypes.func.isRequired,
  onCancel: PropTypes.func.isRequired,
};

export function DeleteRowModal({
  show, rowName, onConfirm, onCancel,
}) {
  return (
    <Modal show={show} onHide={onCancel}>
      <Modal.Header closeButton>
        <Modal.Title>Delete variation?</Modal.Title>
      </Modal.Header>
      <Modal.Body>
        Delete variation <strong>{rowName}</strong>?
      </Modal.Body>
      <Modal.Footer>
        <Button variant="secondary" onClick={onCancel}>Cancel</Button>
        <Button variant="danger" onClick={onConfirm}>Delete</Button>
      </Modal.Footer>
    </Modal>
  );
}
DeleteRowModal.propTypes = {
  show: PropTypes.bool.isRequired,
  rowName: PropTypes.string.isRequired,
  onConfirm: PropTypes.func.isRequired,
  onCancel: PropTypes.func.isRequired,
};

export function NotesEditorModal({
  show, value, onSave, onCancel,
}) {
  const [draft, setDraft] = useState(value || '');
  useEffect(() => { setDraft(value || ''); }, [value, show]);
  return (
    <Modal show={show} onHide={onCancel} size="lg" centered className="app-modal">
      <Modal.Header closeButton>
        <Modal.Title>Notes</Modal.Title>
      </Modal.Header>
      <Modal.Body>
        <Form.Control
          as="textarea"
          rows={10}
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
        />
      </Modal.Body>
      <Modal.Footer>
        <Button variant="secondary" onClick={onCancel}>Cancel</Button>
        <Button variant="primary" onClick={() => onSave(draft)}>Save</Button>
      </Modal.Footer>
    </Modal>
  );
}
NotesEditorModal.propTypes = {
  show: PropTypes.bool.isRequired,
  value: PropTypes.string,
  onSave: PropTypes.func.isRequired,
  onCancel: PropTypes.func.isRequired,
};
NotesEditorModal.defaultProps = { value: '' };

export function AnalysesEditorModal({
  show, analyses, selectedIds, onSave, onCancel,
}) {
  const [draft, setDraft] = useState(selectedIds || []);
  useEffect(() => { setDraft(selectedIds || []); }, [selectedIds, show]);

  const toggle = (id) => {
    setDraft((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  };

  return (
    <Modal show={show} onHide={onCancel} size="lg" centered className="app-modal">
      <Modal.Header closeButton>
        <Modal.Title>Link analyses to this variation</Modal.Title>
      </Modal.Header>
      <Modal.Body>
        {analyses.length === 0 ? (
          <p className="text-muted">This element has no analyses yet.</p>
        ) : (
          <ListGroup>
            {analyses.map((a) => (
              <ListGroup.Item
                key={a.id}
                action
                active={draft.includes(a.id)}
                onClick={() => toggle(a.id)}
              >
                <div className="d-flex justify-content-between">
                  <span>{a.name}</span>
                  {a.kind && <Badge bg="secondary">{a.kind}</Badge>}
                </div>
              </ListGroup.Item>
            ))}
          </ListGroup>
        )}
      </Modal.Body>
      <Modal.Footer>
        <Button variant="secondary" onClick={onCancel}>Cancel</Button>
        <Button variant="primary" onClick={() => onSave(draft)}>Save</Button>
      </Modal.Footer>
    </Modal>
  );
}
AnalysesEditorModal.propTypes = {
  show: PropTypes.bool.isRequired,
  // eslint-disable-next-line react/forbid-prop-types
  analyses: PropTypes.array.isRequired,
  // eslint-disable-next-line react/forbid-prop-types
  selectedIds: PropTypes.array.isRequired,
  onSave: PropTypes.func.isRequired,
  onCancel: PropTypes.func.isRequired,
};

export function HideColumnWarningModal({
  show, columnLabel, onConfirm, onCancel,
}) {
  return (
    <Modal show={show} onHide={onCancel}>
      <Modal.Header closeButton>
        <Modal.Title>Hide column?</Modal.Title>
      </Modal.Header>
      <Modal.Body>
        Column <strong>{columnLabel}</strong> has data in one or more variations.
        Hiding the column will clear the stored values for this column on save.
      </Modal.Body>
      <Modal.Footer>
        <Button variant="secondary" onClick={onCancel}>Cancel</Button>
        <Button variant="warning" onClick={onConfirm}>Hide and clear</Button>
      </Modal.Footer>
    </Modal>
  );
}
HideColumnWarningModal.propTypes = {
  show: PropTypes.bool.isRequired,
  columnLabel: PropTypes.string.isRequired,
  onConfirm: PropTypes.func.isRequired,
  onCancel: PropTypes.func.isRequired,
};
