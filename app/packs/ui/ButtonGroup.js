import React, { useRef, useEffect } from 'react';
import PropTypes from 'prop-types';

function ButtonGroup(props) {
  const { children } = props;
  const groupRef = useRef(null);

  useEffect(() => {
    if (groupRef.current) {
      const buttons = Array.from(groupRef.current.querySelectorAll('button'));
      buttons.forEach((button, index) => {
        const btn = button;

        // reset margin & border
        btn.style.marginRight = '0';
        btn.style.border = 'none';

        if (index === 0) {
          btn.style.borderTopRightRadius = '0';
          btn.style.borderBottomRightRadius = '0';
        } else if (index === buttons.length - 1) {
          btn.style.borderTopLeftRadius = '0';
          btn.style.borderBottomLeftRadius = '0';
        } else {
          btn.style.borderRadius = '0';
        }
      });
    }
  }, [children]);

  return <div ref={groupRef} style={{ display: 'inline-flex' }}>{children}</div>;
}

ButtonGroup.propTypes = {
  children: PropTypes.node.isRequired,
};

export default ButtonGroup;
