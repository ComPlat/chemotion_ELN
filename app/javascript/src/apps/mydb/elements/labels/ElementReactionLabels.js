import React from 'react';
import PropTypes from 'prop-types';
import { Button } from 'react-bootstrap';

import ElementActions from 'src/stores/alt/actions/ElementActions';
import ElementNoAccessTrigger from 'src/apps/mydb/elements/labels/ElementNoAccessTrigger';

const ElementReactionLabels = ({ element, size, variant }) => (
  <ElementNoAccessTrigger
    element={element}
    isAvailable={(currentElement) => Boolean(currentElement.tag?.taggable_data?.reaction_id)}
    fetchElement={(currentElement) => (
      ElementActions.tryFetchReactionById(currentElement.tag.taggable_data.reaction_id)
    )}
    renderTrigger={({ onClick }) => (
      <Button variant={variant} size={size} onClick={onClick} key={element.id}>
        <i className="icon-reaction" />
      </Button>
    )}
    warningMessage="Sorry, you cannot access this Reaction."
  />
);

ElementReactionLabels.propTypes = {
  element: ElementNoAccessTrigger.propTypes.element,
  size: PropTypes.string,
  variant: PropTypes.string,
};

ElementReactionLabels.defaultProps = {
  size: 'xxsm',
  variant: 'light',
};

export default ElementReactionLabels;
