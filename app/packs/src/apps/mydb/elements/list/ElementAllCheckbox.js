import React, { useEffect, useCallback } from 'react';
import PropTypes from 'prop-types';
import Immutable from 'immutable';

import UIStore from 'src/stores/alt/stores/UIStore';
import UIActions from 'src/stores/alt/actions/UIActions';

const options = ["current", "all", "none"];

export default function ElementAllCheckbox({ type }) {
  const [showOptions, setShowOptions] = React.useState(false);
  const [currentOption, setCurrentOption] = React.useState(2);
  const [uiState, setUiState] = React.useState('unchecked');

  useEffect(() => {
    const onUpdate = (uiStore) => {
      const uiState = uiStore[type] ?? {};
      const { checkedAll = false, checkedIds = Immutable.List() } = uiState;
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

  const toggleOptions = useCallback(() => {
    setShowOptions(!showOptions);
  }, [showOptions]);

  const toggleCheckbox = useCallback(() => {
    let newOption = (currentOption + 1) % 3;
    setCurrentOption(newOption);
    selectAll(newOption);
  }, [currentOption]);

  const selectAll = useCallback((option) => {
    if (option == null) option = currentOption;
    let range = options[option];

    UIActions.checkAllElements({
      type: type,
      range: range
    });

    setShowOptions(false);
    setCurrentOption(option);
  }, [type, currentOption]);

  return (
    <div className="all-checkbox" onClick={toggleOptions}>
      <div className="checkbox-dropdown">
        <span className="span-checkbox" onClick={toggleCheckbox}>
          {uiState === 'checked' && <i className="fa fa-check" />}
          {uiState === 'partial' && <i className="fa fa-minus" />}
        </span>
        <i className="fa fa-caret-down ms-2" />
      </div>
      {showOptions && (
        <div className="checkbox-options">
          <div onClick={() => this.selectAll(0)}>Current page</div>
          <div onClick={() => this.selectAll(1)}>All pages</div>
          <div onClick={() => this.selectAll(2)}>None</div>
        </div>
      )}
    </div>
  );
}

ElementAllCheckbox.propTypes = {
  type: PropTypes.string.isRequired,
};
