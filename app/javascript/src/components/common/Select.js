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
    minWidth,
    maxHeight,
    className,
    styles = {},
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
      },
      menuPortal: {
        position: 'fixed',
        zIndex: 9000,
      }
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

    return (
      <BaseComponent
        {...props}
        className={cs(
          baseClassName,
          className,
        )}
        classNamePrefix={baseClassName}
        ref={ref}
        menuPortalTarget={document.body}
        menuPlacement="auto"
        unstyled
        styles={stylesWithOverrides}
      />
    );
  });

  component.displayName = name;
  component.propTypes = {
    ...BaseComponent.propTypes,
    minWidth: PropTypes.string,
    maxHeight: PropTypes.string,
  };
  component.defaultProps = {
    ...BaseComponent.defaultProps,
    minWidth: null,
    maxHeight: null,
  };

  return component;
}

export const Select = buildWrappedComponent('Select', RSelect);
export const AsyncSelect = buildWrappedComponent('AsyncSelect', RAsyncSelect);
export const CreatableSelect = buildWrappedComponent('CreatableSelect', RCreatableSelect);
