import React, { Children, cloneElement } from 'react';
import PropTypes from 'prop-types';

function ButtonGroup({ children }) {
  const totalButtons = Children.count(children);

  const renderChildren = () => Children.map(children, (child, index) => {
    let style = {
      margin: '0',
      border: 'none',
    };

    if (index === 0) {
      style = {
        ...style,
        borderTopRightRadius: '0',
        borderBottomRightRadius: '0',
      };
    } else if (index === totalButtons - 1) {
      style = {
        ...style,
        borderTopLeftRadius: '0',
        borderBottomLeftRadius: '0',
      };
    } else {
      style = {
        ...style,
        borderRadius: '0',
      };
    }

    return cloneElement(child, {
      style: { ...child.props.style, ...style },
    });
  });

  return <div style={{ display: 'inline-flex' }}>{renderChildren()}</div>;
}

ButtonGroup.propTypes = {
  children: PropTypes.node.isRequired,
};

export default ButtonGroup;
