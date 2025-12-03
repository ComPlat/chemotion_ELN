import React, { forwardRef } from 'react';
import PropTypes from 'prop-types';
import RSelect, { components } from 'react-select';
import RAsyncSelect from 'react-select/async';
import RCreatableSelect from 'react-select/creatable';
import cs from 'classnames';

/* eslint-disable react/jsx-props-no-spreading */

// deactivate the default styling and apply custom class names to enable bootstrap styling
// see https://react-select.com/styles#the-unstyled-prop
// see https://react-select.com/styles#the-classnameprefix-prop

const baseClassName = 'chemotion-select';

// Custom Input component that keeps the input visible for editing selected values
const EditableInput = (props) => (
  <components.Input {...props} isHidden={false} />
);

function buildWrappedComponent(name, BaseComponent) {
  const component = forwardRef(({
    size,
    minWidth,
    maxHeight,
    className,
    styles = {},
    components: customComponents = {},
    isInputEditable = false,
    usePortal = true,
    ...props
  }, ref) => {
    const styleDefaults = {
      control: {
        minWidth: minWidth || '0',
      },
      menuList: {
        maxHeight: maxHeight || '250px',
      },
      menu: {
        minWidth: '100%',
        width: 'max-content',
        maxWidth: '400px',
      },
      ...(usePortal && {
        menuPortal: {
          position: 'fixed',
          zIndex: 9000,
        },
      })
    };

    const stylesWithOverrides = {
      ...styles,
      ...Object.entries(styleDefaults).reduce(
        (acc, [key, defaults]) => {
          acc[key] = (base, state) => ({
            ...(styles[key] ? styles[key](base, state) : base),
            ...defaults,
          });
          return acc;
        },
        {}
      )
    };

    // Merge custom components with editable input if needed
    const mergedComponents = {
      ...customComponents,
      ...(isInputEditable && { Input: EditableInput }),
    };

    return (
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
        menuPlacement="auto"
        unstyled
        styles={stylesWithOverrides}
        components={mergedComponents}
      />
    );
  });

  component.displayName = name;
  component.propTypes = {
    ...BaseComponent.propTypes,
    size: PropTypes.string,
    minWidth: PropTypes.string,
    maxHeight: PropTypes.string,
    isInputEditable: PropTypes.bool,
  };
  component.defaultProps = {
    ...BaseComponent.defaultProps,
    size: null,
    minWidth: null,
    maxHeight: null,
    isInputEditable: false,
  };

  return component;
}

export const Select = buildWrappedComponent('Select', RSelect);
export const AsyncSelect = buildWrappedComponent('AsyncSelect', RAsyncSelect);
export const CreatableSelect = buildWrappedComponent('CreatableSelect', RCreatableSelect);
