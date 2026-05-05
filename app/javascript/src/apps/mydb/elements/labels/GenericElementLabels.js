import React from 'react';
import PropTypes from 'prop-types';
import { Button } from 'react-bootstrap';
import ElementActions from 'src/stores/alt/actions/ElementActions';
import UserStore from 'src/stores/alt/stores/UserStore';
import ElementIcon from 'src/components/common/ElementIcon';
import ElementNoAccessTrigger from 'src/apps/mydb/elements/labels/ElementNoAccessTrigger';

function GenericElementLabels({ element }) {
  if (!element.tag?.taggable_data?.element) {
    return null;
  }

  const elInfo = element.tag.taggable_data.element;
  const klasses = UserStore.getState().genericEls;
  const klass = (klasses && klasses.find((currentElement) => currentElement.name === elInfo.type)) || {};
  const iconElement = { ...klass, type: elInfo.type };

  return (
    <ElementNoAccessTrigger
      element={element}
      isAvailable={(currentElement) => Boolean(currentElement.tag?.taggable_data?.element)}
      fetchElement={(currentElement) => (
        ElementActions.tryFetchGenericElById(currentElement.tag.taggable_data.element.id)
      )}
      renderTrigger={({ onClick }) => (
        <Button variant="light" size="xxsm" onClick={onClick} key={element.id}>
          <ElementIcon element={iconElement} />
        </Button>
      )}
      warningMessage="Sorry, you cannot access this Element."
    />
  );
}

GenericElementLabels.propTypes = {
  element: PropTypes.shape({
    id: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
    tag: PropTypes.shape({
      taggable_data: PropTypes.shape({
        element: PropTypes.shape({
          id: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
          type: PropTypes.string,
        }),
      }),
    }),
  }).isRequired,
};

export default GenericElementLabels;
