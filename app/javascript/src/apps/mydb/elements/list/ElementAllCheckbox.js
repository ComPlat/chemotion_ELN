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
    <div className="all-checkbox" onClick={toggleOptions}>
      <div className="checkbox-dropdown">
        <span className="span-checkbox" onClick={toggleCheckbox}>
          {uiState === 'checked' && <i className="fa fa-check" />}
          {uiState === 'partial' && <i className="fa fa-minus" />}
          {uiState === 'unchecked' && <i className="fa" />}
        </span>
        <i className="fa fa-caret-down ms-2" />
      </div>
      {showOptions && (
        <div className="checkbox-options">
          <div onClick={() => selectAll(0)}>Current page</div>
          <div onClick={() => selectAll(1)}>All pages</div>
          <div onClick={() => selectAll(2)}>None</div>
        </div>
      )}
    </div>
  );
}

ElementAllCheckbox.propTypes = {
  type: PropTypes.string.isRequired,
};
