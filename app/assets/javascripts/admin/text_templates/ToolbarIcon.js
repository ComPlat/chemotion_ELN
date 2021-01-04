import React from 'react';
import PropTypes from 'prop-types';

const ToolbarIcon = ({ template }) => {
  if (!template) return <span />;

  const { data, name } = template;

  if (data.icon) {
    return (
      <i className={data.icon} />
    );
  }

  const text = (data || {}).text || name;

  return (
    <span>{text.toUpperCase()}</span>
  );
};

ToolbarIcon.propTypes = {
  // eslint-disable-next-line react/forbid-prop-types
  template: PropTypes.object
};

ToolbarIcon.defaultProps = {
  template: null
};

export default ToolbarIcon;
