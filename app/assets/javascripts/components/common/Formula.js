import React from 'react';
import PropTypes from 'prop-types';
import { compact } from 'lodash';

const Formula = ({ formula, customText }) => {
  let content = '';
  if (formula) {
    const keys = formula.split(/([A-Za-z]{1}[a-z]{0,2})(\+?)(-?)(\d*)/);
    content = compact(keys).map((item, i) => {
      const key = `${item}-${i}`;
      if ((/\d+/).test(item)) {
        return <sub key={key}>{item}</sub>;
      } else if ((/[+-]/).test(item)) {
        return <sup key={key}>{item}</sup>;
      }
      return item;
    });
  }
  const custom = customText || '';
  return (
    <span>
      {content}
      {custom}
    </span>
  );
};

Formula.propTypes = {
  formula: PropTypes.string,
  customText: PropTypes.string,
};

Formula.defaultProps = {
  formula: '',
  customText: '',
};

export default Formula;
