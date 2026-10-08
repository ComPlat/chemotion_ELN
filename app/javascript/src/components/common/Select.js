import React, {
  forwardRef, useCallback, useRef, useState,
} from 'react';
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

// The smaller of the room react-select measured for the menu and the configured
// cap. react-select places a fixed-position menu against the space it found
// below (or above) the control and passes that as the menu list's maxHeight;
// replacing it with a taller cap renders a list that runs off the viewport, and
// a fixed-position element cannot be scrolled back into view.
const capMenuHeight = (measured, cap) => {
  if (measured === undefined || measured === null) return cap;
  const measuredCss = typeof measured === 'number' ? `${measured}px` : measured;
  return `min(${measuredCss}, ${cap})`;
};

// Breathing room between the menu and the edge of the window.
const MENU_GUTTER = 8;
// Below this, a menu below the control is too small to be worth keeping there.
const MIN_MENU_HEIGHT = 140;

// How much room the menu actually has, measured from the control.
//
// react-select measures this itself, but only after the menu has mounted, and
// for a menu portalled to the body at `position: fixed` that measurement does
// not survive: it keeps the unmeasured default, renders taller than the room
// below the control, and the overflow is unreachable because a fixed element
// does not scroll with the page. Measuring the control up front does not depend
// on any of that.
const fitMenu = (controlEl) => {
  if (!controlEl || typeof window === 'undefined') return null;

  const rect = controlEl.getBoundingClientRect();
  const below = window.innerHeight - rect.bottom - MENU_GUTTER;
  const above = rect.top - MENU_GUTTER;
  const flip = below < MIN_MENU_HEIGHT && above > below;

  return {
    menuPlacement: flip ? 'top' : 'bottom',
    maxMenuHeight: Math.max(0, flip ? above : below),
  };
};

// Custom Input component that keeps the input visible for editing selected values
function EditableInput(props) {
  return <components.Input {...props} isHidden={false} />;
}

function buildWrappedComponent(name, BaseComponent) {
  const component = forwardRef(({
    size,
    variant,
    minWidth,
    maxHeight,
    className,
    styles = {},
    components: customComponents = {},
    isInputEditable = false,
    usePortal = true,
    onMenuOpen,
    ...props
  }, ref) => {
    const selectRef = useRef(null);
    const [menuFit, setMenuFit] = useState(null);

    // The caller's ref still has to reach the select; this one is ours, for the
    // control element fitMenu measures.
    const attachRef = useCallback((instance) => {
      selectRef.current = instance;
      if (typeof ref === 'function') ref(instance);
      else if (ref) ref.current = instance;
    }, [ref]);

    // Only the portalled (fixed) menu needs this. An in-flow menu is positioned
    // in the document and can simply be scrolled to.
    const handleMenuOpen = useCallback((...args) => {
      if (usePortal) setMenuFit(fitMenu(selectRef.current?.controlRef));
      if (onMenuOpen) onMenuOpen(...args);
    }, [usePortal, onMenuOpen]);

    const styleDefaults = {
      control: {
        minWidth: minWidth || '0',
      },
      menuList: (base) => ({
        maxHeight: capMenuHeight(base.maxHeight, maxHeight || '250px'),
      }),
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
      }),
      // react-select's own input styling sets `visibility: hidden` on the input
      // wrapper whenever isDisabled is true, regardless of the isHidden prop that
      // EditableInput below controls — without this override, a disabled select in
      // isInputEditable mode shows no text at all, since the container hides it.
      // Scoped to state.isDisabled specifically, matching that one case.
      ...(isInputEditable && {
        input: (base, state) => (state.isDisabled ? { visibility: 'visible' } : {}),
      })
    };

    const stylesWithOverrides = {
      ...styles,
      ...Object.entries(styleDefaults).reduce(
        (acc, [key, defaults]) => {
          acc[key] = (base, state) => ({
            ...base,
            ...(typeof defaults === 'function' ? defaults(base, state) : defaults),
            ...(styles[key] ? styles[key](base, state) : {}),
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

    // menuFit is spread after the defaults above: once the control has been
    // measured, its placement and height win over `auto`.
    return (
      <BaseComponent
        {...props}
        className={cs(
          baseClassName,
          `select-${variant}`,
          className,
          { [`form-select-${size}`]: !!size }
        )}
        classNamePrefix={baseClassName}
        ref={attachRef}
        menuPortalTarget={usePortal ? document.body : undefined}
        menuPlacement="auto"
        menuPosition="fixed"
        {...menuFit}
        onMenuOpen={handleMenuOpen}
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
    variant: PropTypes.string,
    minWidth: PropTypes.string,
    maxHeight: PropTypes.string,
    isInputEditable: PropTypes.bool,
  };
  component.defaultProps = {
    ...BaseComponent.defaultProps,
    size: null,
    variant: 'light',
    minWidth: null,
    maxHeight: null,
    isInputEditable: false,
  };

  return component;
}

export const Select = buildWrappedComponent('Select', RSelect);
export const AsyncSelect = buildWrappedComponent('AsyncSelect', RAsyncSelect);
export const CreatableSelect = buildWrappedComponent('CreatableSelect', RCreatableSelect);
