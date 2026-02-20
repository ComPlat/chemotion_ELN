import React, { useState, useEffect, useCallback, useRef } from 'react';
import PropTypes from 'prop-types';
import { Form } from 'react-bootstrap';

import { Select } from 'src/components/common/Select';
import ReorderableList from 'src/components/common/ReorderableList';
import { conditionsOptions } from 'src/components/staticDropdownOptions/options';
import CreateButton from 'src/components/common/CreateButton';
import DeleteButton from 'src/components/common/DeleteButton';

// Function to decode all HTML entities (named, numeric decimal, and hexadecimal)
function decodeHtmlEntities(text) {
  if (!text) return text;
  
  // Use browser's native HTML entity decoding
  // This handles named entities (&gt;, &lt;, &amp;, etc.)
  // numeric decimal entities (&#62;, &#60;, etc.)
  // and hexadecimal entities (&#x3E;, &#x3C;, etc.)
  const textarea = document.createElement('textarea');
  textarea.innerHTML = text;
  return textarea.value;
}

function textToLines(text) {
  if (!text || text.trim() === '') return [];
  // Decode HTML entities when loading conditions from props
  return text.split('\n').map(line => decodeHtmlEntities(line));
}

export default function ReactionConditions({
  conditions: conditionsProp,
  isDisabled,
  onChange,
}) {
  const [conditions, setConditions] = useState(textToLines(conditionsProp));
  const debounceTimerRef = useRef(null);
  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;

  useEffect(
    () => setConditions(textToLines(conditionsProp)),
    [conditionsProp]
  );

  // Cleanup debounce timer on unmount
  useEffect(() => {
    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, []);

  const handleChange = useCallback((newConditions) => {
    setConditions(newConditions);
    // Use ref so parent and graphic update are always called (including when list was empty)
    onChangeRef.current(newConditions.join('\n'));
  }, []);

  const addCondition = useCallback((value = '') => {
    // Decode HTML entities when adding from dropdown or manual input
    const decodedValue = decodeHtmlEntities(value);
    if (conditions.includes(decodedValue)) return;
    handleChange([...conditions, decodedValue]);
  }, [conditions, handleChange]);

  const updateCondition = useCallback((index, value) => {
    // Decode HTML entities in real-time (handles any HTML entity)
    const decodedValue = decodeHtmlEntities(value);
    
    // Update local state immediately for responsive UI
    const updatedConditions = [...conditions];
    updatedConditions[index] = decodedValue;
    setConditions(updatedConditions);

    // Clear existing debounce timer
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    // Debounce the API call
    debounceTimerRef.current = setTimeout(() => {
      handleChange(updatedConditions);
    }, 500); // 500ms debounce delay
  }, [conditions, handleChange]);

  const removeCondition = useCallback((index) => {
    // Clear debounce timer when removing
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }
    handleChange(conditions.filter((_, i) => i !== index));
  }, [conditions, handleChange]);

  return (
    <div className="material-group">
      <div className="pseudo-table__row pseudo-table__row-header">
        <div className="pseudo-table__cell pseudo-table__cell-title">
          <div className="material-group__header-title">
            <CreateButton
              onClick={() => addCondition()}
              isDisabled={isDisabled}
              size="xsm"
            />
            <span>Conditions</span>
            <Select
              disabled={isDisabled}
              name="default_conditions"
              multi={false}
              options={conditionsOptions}
              onChange={({ value }) => addCondition(value)}
              size="xsm"
              placeholder="Add"
            />
          </div>
        </div>
      </div>
      <ReorderableList
        items={conditions}
        getItemId={(item) => conditions.indexOf(item).toString()}
        onReorder={handleChange}
        renderItem={(condition, index) => (
          <div className="w-100 d-flex align-items-center gap-2 py-2">
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
