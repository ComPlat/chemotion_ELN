import React from 'react';
import { Button } from 'react-bootstrap';

import ElementActions from 'src/stores/alt/actions/ElementActions';
import ElementNoAccessTrigger from 'src/apps/mydb/elements/labels/ElementNoAccessTrigger';

function ElementReactionLabels({ element }) {
  return (
    <ElementNoAccessTrigger
      element={element}
      isAvailable={(currentElement) => Boolean(currentElement.tag?.taggable_data?.reaction_id)}
      fetchElement={(currentElement) => (
        ElementActions.tryFetchReactionById(currentElement.tag.taggable_data.reaction_id)
      )}
      renderTrigger={({ onClick }) => (
        <Button variant="light" size="xxsm" onClick={onClick} key={element.id}>
          <i className="icon-reaction" />
        </Button>
      )}
      warningMessage="Sorry, you cannot access this Reaction."
    />
  );
}

ElementReactionLabels.propTypes = ElementNoAccessTrigger.propTypes;

export default ElementReactionLabels;
