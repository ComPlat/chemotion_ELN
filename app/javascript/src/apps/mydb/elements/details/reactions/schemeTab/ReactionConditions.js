import React, { useState, useEffect, useCallback } from 'react';
import PropTypes from 'prop-types';
import { Button, Form } from 'react-bootstrap';

import { Select } from 'src/components/common/Select';
import ReorderableList from 'src/components/common/ReorderableList';
import { conditionsOptions } from 'src/components/staticDropdownOptions/options';

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
    <div className="reaction-conditions">
      <div>Conditions:</div>
      <Select
        disabled={isDisabled}
        name="default_conditions"
        multi={false}
        options={conditionsOptions}
        onChange={({ value }) => addCondition(value)}
      />
      <Button
        variant="primary"
        size="sm"
        onClick={() => addCondition()}
        isDisabled={isDisabled}
        className="add-condition-button"
      >
        Add Condition
      </Button>

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
            <Button
              variant="danger"
              size="sm"
              onClick={() => removeCondition(index)}
              className="remove-condition-button"
            >
              Remove
            </Button>
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
