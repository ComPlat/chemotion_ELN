import React, { useMemo, useState } from 'react';
import PropTypes from 'prop-types';
import { Badge, Button, Form, Modal } from 'react-bootstrap';
import { Select } from 'src/components/common/Select';
import UIStore from 'src/stores/alt/stores/UIStore';
import UserStore from 'src/stores/alt/stores/UserStore';
import ElementActions from 'src/stores/alt/actions/ElementActions';

const labelOption = ({ title, color, access_level }) => (
  <Badge
    bg="custom"
    style={{
      backgroundColor: color,
      borderRadius: access_level === 2 ? '0.25em' : '10px',
    }}
  >
    {title}
  </Badge>
);

const SelectionUserLabelsModal = ({ onHide }) => {
  const { currentUser, labels } = UserStore.getState();
  const editableLabels = useMemo(() => (
    (labels || []).filter((l) => l.access_level === 2 || l.user_id === currentUser?.id)
  ), [labels, currentUser]);

  const [toAdd, setToAdd] = useState([]);
  const [toRemove, setToRemove] = useState([]);

  const handleSubmit = () => {
    ElementActions.bulkUpdateUserLabels({
      ui_state: UIStore.getState(),
      add_label_ids: toAdd.map((l) => l.id),
      remove_label_ids: toRemove.map((l) => l.id),
    });
    onHide();
  };

  const disabled = toAdd.length === 0 && toRemove.length === 0;

  return (
    <Modal show centered onHide={onHide}>
      <Modal.Header closeButton>
        <Modal.Title>Bulk edit user labels</Modal.Title>
      </Modal.Header>
      <Modal.Body>
        <Form>
          <Form.Group className="mb-3">
            <Form.Label>Add labels</Form.Label>
            <Select
              isMulti
              options={editableLabels}
              value={toAdd}
              getOptionValue={(l) => l.id}
              getOptionLabel={(l) => l.title}
              formatOptionLabel={labelOption}
              onChange={(vals) => setToAdd(vals || [])}
              placeholder="-- Select labels to add --"
            />
          </Form.Group>
          <Form.Group className="mb-3">
            <Form.Label>Remove labels</Form.Label>
            <Select
              isMulti
              options={editableLabels}
              value={toRemove}
              getOptionValue={(l) => l.id}
              getOptionLabel={(l) => l.title}
              formatOptionLabel={labelOption}
              onChange={(vals) => setToRemove(vals || [])}
              placeholder="-- Select labels to remove --"
            />
          </Form.Group>
          <Button variant="warning" onClick={handleSubmit} disabled={disabled}>
            Apply to selection
          </Button>
        </Form>
      </Modal.Body>
    </Modal>
  );
};

SelectionUserLabelsModal.propTypes = {
  onHide: PropTypes.func.isRequired,
};

export default SelectionUserLabelsModal;
