import React from 'react';
import { useAccordionButton } from 'react-bootstrap/AccordionButton';

const AccordionHeaderWithButtons = ({ children, eventKey, callback }) => {
  const decoratedOnClick = useAccordionButton(eventKey, () => callback && callback(eventKey));

  return (
    <div type="button" onClick={decoratedOnClick}>
      {children}
    </div>
  );
}

export default AccordionHeaderWithButtons;
