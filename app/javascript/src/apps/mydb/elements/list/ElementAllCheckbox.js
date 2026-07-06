import React, { useState, useEffect } from 'react';
import PropTypes from 'prop-types';
import { List } from 'immutable';

import UIStore from 'src/stores/alt/stores/UIStore';
import UIActions from 'src/stores/alt/actions/UIActions';

const options = ['current', 'all', 'none'];

export default function ElementAllCheckbox({ type }) {
  const [showOptions, setShowOptions] = useState(false);
  const [currentOption, setCurrentOption] = useState(2);
  const [uiState, setUiState] = useState('unchecked');

  useEffect(() => {
    const onUpdate = (uiStore) => {
      const typeState = uiStore[type] ?? {};
      const { checkedAll = false, checkedIds = List() } = typeState;
      if (checkedAll) {
        setUiState('checked');
      } else if (checkedIds.size > 0) {
        setUiState('partial');
      } else {
        setUiState('unchecked');
      }
    };

    UIStore.listen(onUpdate);
    onUpdate(UIStore.getState());
    return () => UIStore.unlisten(onUpdate);
  }, [type]);

  const toggleOptions = (e) => {
    e.stopPropagation();
    setShowOptions(!showOptions);
  };

  const selectAll = (option) => {
    const range = options[option];
    UIActions.checkAllElements({ type, range });

    setShowOptions(false);
    setCurrentOption(option);
  };

  const toggleCheckbox = (e) => {
    e.stopPropagation();
    const newOption = (currentOption + 1) % options.length;
    setCurrentOption(newOption);
    selectAll(newOption);
  };

  let ariaChecked;
  if (uiState === 'checked') ariaChecked = true;
  else if (uiState === 'partial') ariaChecked = 'mixed';
  else ariaChecked = false;
  const listboxId = `element-all-checkbox-listbox-${type}`;

  return (
    <div
      role="combobox"
      aria-expanded={showOptions}
      aria-haspopup="listbox"
      aria-controls={listboxId}
      tabIndex={0}
      className="element-all-checkbox select-secondary chemotion-select position-static form-select-sm"
      onClick={toggleOptions}
      onKeyDown={(e) => e.key === 'Enter' && toggleOptions(e)}
    >
      <div className="chemotion-select__control">
        <span
          role="checkbox"
          aria-label="Select all elements"
          aria-checked={ariaChecked}
          tabIndex={-1}
          className={`form-check-input form-check-input--${uiState}`}
          onClick={toggleCheckbox}
          onKeyDown={(e) => e.key === 'Enter' && toggleCheckbox(e)}
        />
        <i className="chemotion-select__indicator chemotion-select__dropdown-indicator" />
      </div>
      {showOptions && (
        <div role="listbox" id={listboxId} className="chemotion-select__menu">
          {options.map((option, index) => {
            const isSelected = currentOption === index;
            const selectedClass = isSelected ? ' chemotion-select__option--is-selected' : '';
            const optionClassName = `chemotion-select__option${selectedClass}`;
            return (
              <div
                key={option}
                role="option"
                aria-selected={isSelected}
                tabIndex={-1}
                className={optionClassName}
                onClick={() => selectAll(index)}
                onKeyDown={(e) => e.key === 'Enter' && selectAll(index)}
              >
                {option === 'current' && 'Current page'}
                {option === 'all' && 'All pages'}
                {option === 'none' && 'None'}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

ElementAllCheckbox.propTypes = {
  type: PropTypes.string.isRequired,
};
