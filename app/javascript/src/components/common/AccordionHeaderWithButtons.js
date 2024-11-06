import React from 'react';
import { useContext } from 'react';
import AccordionContext from 'react-bootstrap/AccordionContext';
import { useAccordionButton } from 'react-bootstrap/AccordionButton';
import ChevronIcon from 'src/components/common/ChevronIcon';

const AccordionHeaderWithButtons = ({ children, eventKey, callback }) => {
  const { activeEventKey } = useContext(AccordionContext);
  const decoratedOnClick = useAccordionButton(eventKey, () => callback && callback(eventKey));
  const isActiveTab = activeEventKey === eventKey;

  return (
    <div className={'d-flex align-items-center gap-3 p-3' + (isActiveTab ? " bg-gray-200 border-bottom" : " bg-gray-100 border-bottom-0")}>
      <div className='flex-grow-1'>
        {children}
      </div>
      <ChevronIcon
        direction={isActiveTab ? "down" : "right"}
        onClick={decoratedOnClick}
        color="primary"
        className="fs-5"
        role="button"
      />
    </div>
  );
}

export default AccordionHeaderWithButtons;
