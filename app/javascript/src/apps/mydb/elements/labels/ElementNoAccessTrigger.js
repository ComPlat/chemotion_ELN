import React, { useEffect, useState } from 'react';
import PropTypes from 'prop-types';

import AppModal from 'src/components/common/AppModal';
import ElementActions from 'src/stores/alt/actions/ElementActions';
import ElementStore from 'src/stores/alt/stores/ElementStore';

function ElementNoAccessTrigger({
  element,
  isAvailable,
  fetchElement,
  renderTrigger,
  warningMessage,
}) {
  const [showWarning, setShowWarning] = useState(false);
  const [clicked, setClicked] = useState(false);

  useEffect(() => {
    const onStoreChange = (state) => {
      setShowWarning((prevShowWarning) => {
        if (prevShowWarning === state.elementWarning) {
          return prevShowWarning;
        }

        return state.elementWarning;
      });
    };

    ElementStore.listen(onStoreChange);

    return () => {
      ElementStore.unlisten(onStoreChange);
    };
  }, []);

  if (!isAvailable(element)) {
    return null;
  }

  const closeWarning = () => {
    setShowWarning(false);
    ElementActions.closeWarning();
  };

  const handleClick = (event) => {
    fetchElement(element);
    setClicked(true);
    event.stopPropagation();
  };

  return (
    <>
      {renderTrigger({ element, onClick: handleClick })}
      <AppModal
        show={showWarning && clicked}
        onHide={closeWarning}
        title="No Access to Element"
        showFooter
        closeLabel="Close"
      >
        {warningMessage}
      </AppModal>
    </>
  );
}

ElementNoAccessTrigger.propTypes = {
  element: PropTypes.shape({
    id: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
    tag: PropTypes.shape({
      taggable_data: PropTypes.shape({}),
    }),
  }).isRequired,
  isAvailable: PropTypes.func.isRequired,
  fetchElement: PropTypes.func.isRequired,
  renderTrigger: PropTypes.func.isRequired,
  warningMessage: PropTypes.string.isRequired,
};

export default ElementNoAccessTrigger;
