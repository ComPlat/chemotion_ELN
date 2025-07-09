import React, { forwardRef } from 'react';
import PropTypes from 'prop-types';
import RSelect from 'react-select';
import RAsyncSelect from 'react-select/async';
import RCreatableSelect from 'react-select/creatable';
import cs from 'classnames';

/* eslint-disable react/jsx-props-no-spreading */

// deactivate the default styling and apply custom class names to enable bootstrap styling
// see https://react-select.com/styles#the-unstyled-prop
// see https://react-select.com/styles#the-classnameprefix-prop

const baseClassName = 'chemotion-select';

function buildWrappedComponent(name, BaseComponent) {
  const component = forwardRef(({
    size,
    minWidth,
    maxHeight,
    className,
    styles,
    ...props
  }, ref) => (
    <BaseComponent
      {...props}
      className={cs(
        baseClassName,
        className,
        { [`form-select-${size}`]: !!size }
      )}
      classNamePrefix={baseClassName}
      ref={ref}
      menuPortalTarget={document.body}
      unstyled
      styles={{
        ...styles,
        control: (base, state) => ({
          ...(styles?.control ? styles.control(base, state) : base),
          minWidth: minWidth || '0',
        }),
        menuList: (base, state) => ({
          ...(styles?.menuList ? styles.menuList(base, state) : base),
          maxHeight: maxHeight || '250px',
        }),
        menu: (base, state) => ({
          ...(styles?.menu ? styles.menu(base, state) : base),
          minWidth: '100%',
          width: 'max-content',
        }),
      }}
    />
  ));

  component.displayName = name;
  component.propTypes = {
    ...BaseComponent.propTypes,
    size: PropTypes.string,
    minWidth: PropTypes.string,
    maxHeight: PropTypes.string,
  };
  component.defaultProps = {
    ...BaseComponent.defaultProps,
    size: null,
    minWidth: null,
    maxHeight: null,
  };

  return component;
}

export const Select = buildWrappedComponent('Select', RSelect);
export const AsyncSelect = buildWrappedComponent('AsyncSelect', RAsyncSelect);
export const CreatableSelect = buildWrappedComponent('CreatableSelect', RCreatableSelect);
