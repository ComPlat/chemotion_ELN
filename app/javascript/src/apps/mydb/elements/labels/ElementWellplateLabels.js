import React from 'react';
import { Button } from 'react-bootstrap';

import ElementActions from 'src/stores/alt/actions/ElementActions';
import ElementNoAccessTrigger from 'src/apps/mydb/elements/labels/ElementNoAccessTrigger';

const ElementWellplateLabels = ({ element }) => (
    <ElementNoAccessTrigger
      element={element}
      isAvailable={(currentElement) => Boolean(currentElement.tag?.taggable_data?.wellplate_id)}
      fetchElement={(currentElement) => (
        ElementActions.tryFetchWellplateById(currentElement.tag.taggable_data.wellplate_id)
      )}
      renderTrigger={({ onClick }) => (
        <Button variant="light" size="xxsm" onClick={onClick} key={element.id}>
          <i className="icon-wellplate" />
        </Button>
      )}
      warningMessage="Sorry, you cannot access this Wellplate."
    />
  );

ElementWellplateLabels.propTypes = {
  element: ElementNoAccessTrigger.propTypes.element,
};

export default ElementWellplateLabels;
