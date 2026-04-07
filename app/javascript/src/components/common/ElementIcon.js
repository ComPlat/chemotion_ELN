import React from 'react';
import PropTypes from 'prop-types';

export function resolveElementIconClass({
  element,
} = {}) {
  if (element && element.element_klass && element.element_klass.icon_name) {
    return element.element_klass.icon_name;
  }

  if (element && element.icon_name) {
    return element.icon_name;
  }

  const resolvedType = element && (element.element_type || element.type);
  if (resolvedType) return `icon-${String(resolvedType).toLowerCase()}`;

  return 'fa fa-file-o';
}

export default function ElementIcon({
  element,
  className,
  title,
}) {
  const resolvedClassName = resolveElementIconClass({
    element,
  });
  const iconClassName = [resolvedClassName, className].filter(Boolean).join(' ');

  return (
    <i
      className={iconClassName}
      title={title}
      aria-hidden="true"
    />
  );
}

ElementIcon.propTypes = {
  element: PropTypes.shape({
    type: PropTypes.string,
    element_type: PropTypes.string,
    icon_name: PropTypes.string,
    element_klass: PropTypes.shape({
      icon_name: PropTypes.string,
    }),
  }),
  className: PropTypes.string,
  title: PropTypes.string,
};

ElementIcon.defaultProps = {
  element: null,
  className: null,
  title: null,
};
