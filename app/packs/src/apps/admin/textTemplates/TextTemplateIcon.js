import React from 'react';
import PropTypes from 'prop-types';

const TextTemplateIcon = ({ template }) => {
  if (!template) return <span />;

  const { data, name } = template;

  if (data.icon) {
    return (
      <i className={`fs-5 mt-2 ${data.icon}`} />
    );
  }

  const text = (data || {}).text || name;

  return (
    <span className='fs-4'>{text.toUpperCase()}</span>
  );
};

TextTemplateIcon.propTypes = {
  // eslint-disable-next-line react/forbid-prop-types
  template: PropTypes.object
};

TextTemplateIcon.defaultProps = {
  template: null
};

export default TextTemplateIcon;
