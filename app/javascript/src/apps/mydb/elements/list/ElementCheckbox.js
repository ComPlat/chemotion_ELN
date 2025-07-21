import React, { useState, useEffect } from 'react';
import PropTypes from 'prop-types';
import { Form } from 'react-bootstrap';

import UIActions from 'src/stores/alt/actions/UIActions';
import UIStore from 'src/stores/alt/stores/UIStore';

export default function ElementCheckbox({ element }) {
  const [checked, setChecked] = useState(false);

  useEffect(() => {
    const handleUiStoreChange = (uiState) => {
      const { checkedIds = [], uncheckedIds = [], checkedAll } = uiState[element.type] ?? {};
      const newChecked = (checkedAll && !uncheckedIds.includes(element.id))
        || checkedIds.includes(element.id);
      setChecked(newChecked);
    };
    handleUiStoreChange(UIStore.getState());

    UIStore.listen(handleUiStoreChange);
    return () => UIStore.unlisten(handleUiStoreChange);
  }, []);

  const toggleCheckbox = () => {
    if (checked) {
      UIActions.uncheckElement(element);
    } else {
      UIActions.checkElement(element);
    }
  };

  return (
    <Form.Check
      onChange={toggleCheckbox}
      checked={checked}
      className="element-checkbox"
    />
  );
}

ElementCheckbox.propTypes = {
  element: PropTypes.shape({
    id: PropTypes.oneOfType([
      PropTypes.number,
      PropTypes.string,
    ]).isRequired,
    type: PropTypes.string.isRequired,
  }).isRequired,
};
