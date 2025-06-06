import React, { useState, useEffect } from 'react';
import PropTypes from 'prop-types';
import Immutable from 'immutable';

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
      const { checkedAll = false, checkedIds = Immutable.List() } = typeState;
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

  return (
    <div className="element-all-checkbox" onClick={toggleOptions}>
      <div className="chemotion-select__control">
        <span className={`form-check-input form-check-input--${uiState}`} onClick={toggleCheckbox} />
        <i className="chemotion-select__indicator chemotion-select__dropdown-indicator" />
      </div>
      {showOptions && (
        <div className="chemotion-select__menu">
          {options.map((option, index) => (
            <div
              key={option}
              className={`chemotion-select__option${currentOption === index ? ' chemotion-select__option--is-selected' : ''}`}
              onClick={() => selectAll(index)}
            >
              {option === 'current' && 'Current page'}
              {option === 'all' && 'All pages'}
              {option === 'none' && 'None'}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

ElementAllCheckbox.propTypes = {
  type: PropTypes.string.isRequired,
};
