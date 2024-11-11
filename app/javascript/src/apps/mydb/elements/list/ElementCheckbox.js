import React, { useState, useEffect, useCallback } from 'react';
import PropTypes from 'prop-types';
import { Form } from 'react-bootstrap';

import UIStore from 'src/stores/alt/stores/UIStore';
import UIActions from 'src/stores/alt/actions/UIActions';

export default function ElementCheckbox({ element }) {
  const [isChecked, setIsChecked] = useState(false);
  const { id, type } = element;

  useEffect(() => {
    const onChange = (uiStore) => {
      const elementState = uiStore[type];
      if (!elementState) {
        setIsChecked(false);
        return;
      }

      const { checkedIds, uncheckedIds, checkedAll } = elementState;
      setIsChecked(
        (checkedAll && !uncheckedIds.includes(id))
        || checkedIds.includes(id)
      );
    };

    UIStore.listen(onChange);
    onChange(UIStore.getState());
    return () => UIStore.unlisten(onChange);
  }, [id, type]);

  const toggleCheckbox = useCallback(() => {
    if (isChecked) {
      UIActions.uncheckElement(element);
    } else {
      UIActions.checkElement(element);
    }
  }, [id, type, isChecked]);

  return (
    <Form.Check
      onChange={toggleCheckbox}
      checked={isChecked}
      className="element-checkbox"
    />
  );
}

ElementCheckbox.propTypes = {
  element: PropTypes.shape({
    id: PropTypes.string.isRequired,
    type: PropTypes.string.isRequired,
  }).isRequired,
};
