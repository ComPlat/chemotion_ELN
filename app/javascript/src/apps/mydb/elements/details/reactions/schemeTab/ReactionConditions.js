import React, { useState, useEffect, useCallback } from 'react';
import PropTypes from 'prop-types';
import { Form } from 'react-bootstrap';

import { Select } from 'src/components/common/Select';
import ReorderableList from 'src/components/common/ReorderableList';
import { conditionsOptions } from 'src/components/staticDropdownOptions/options';
import CreateButton from 'src/components/common/CreateButton';
import DeleteButton from 'src/components/common/DeleteButton';

function textToLines(text) {
  if (!text || text.trim() === '') return [];
  return text.split('\n');
}

export default function ReactionConditions({
  conditions: conditionsProp,
  isDisabled,
  onChange,
}) {
  const [conditions, setConditions] = useState(textToLines(conditionsProp));

  useEffect(
    () => setConditions(textToLines(conditionsProp)),
    [conditionsProp]
  );

  const handleChange = useCallback((newConditions) => {
    setConditions(newConditions);
    onChange(newConditions.join('\n'));
  }, [onChange]);

  const addCondition = useCallback((value = '') => {
    if (conditions.includes(value)) return;
    handleChange([...conditions, value]);
  }, [conditions]);

  const updateCondition = useCallback((index, value) => {
    const updatedConditions = [...conditions];
    updatedConditions[index] = value;
    handleChange(updatedConditions);
  }, [conditions]);

  const removeCondition = useCallback((index) => {
    handleChange(conditions.filter((_, i) => i !== index));
  }, [conditions]);

  return (
    <div className="material-group">
      <div className="pseudo-table__row pseudo-table__row-header">
        <div className="pseudo-table__cell pseudo-table__cell-title">
          <div className="material-group__header-title">
            Conditions
            <div className="material-group__add-actions">
              <Select
                disabled={isDisabled}
                name="default_conditions"
                multi={false}
                options={conditionsOptions}
                onChange={({ value }) => addCondition(value)}
                size="sm"
                placeholder="Add"
              />
              <CreateButton
                onClick={() => addCondition()}
                isDisabled={isDisabled}
              />
            </div>
          </div>
        </div>
      </div>
      <ReorderableList
        items={conditions}
        getItemId={(item) => conditions.indexOf(item).toString()}
        onReorder={handleChange}
        renderItem={(condition, index) => (
          <div className="w-100 d-flex align-items-center gap-2">
            <Form.Control
              className="flex-grow-1"
              key={`condition-${index}`}
              type="text"
              size="sm"
              value={condition}
              onChange={(e) => updateCondition(index, e.target.value)}
            />
            <DeleteButton
              onClick={() => removeCondition(index)}
            />
          </div>
        )}
      />
    </div>
  );
}

ReactionConditions.propTypes = {
  conditions: PropTypes.string.isRequired,
  isDisabled: PropTypes.bool.isRequired,
  onChange: PropTypes.func.isRequired,
};
