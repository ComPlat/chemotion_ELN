import React from 'react';
import PropTypes from 'prop-types';
import { Button, OverlayTrigger, Tooltip } from 'react-bootstrap';

export default function DetailCardButton({
  label,
  iconClass,
  header,
  ...buttonProps
}) {
  const resolvedButtonProps = {
    ...buttonProps,
    variant: buttonProps.variant || 'secondary',
    ...(header ? { size: 'sm' } : {}),
  };

  const buttonContent = header
    ? <i className={iconClass} />
    : (
      <>
        <i className={`${iconClass} me-1`} />
        <span>{label}</span>
      </>
    );
  const button = React.createElement(Button, resolvedButtonProps, buttonContent);

  if (header) {
    return (
      <OverlayTrigger
        placement="bottom"
        overlay={<Tooltip id="detail-card-button-tooltip">{label}</Tooltip>}
      >
        {button}
      </OverlayTrigger>
    );
  }

  return button;
}

DetailCardButton.propTypes = {
  label: PropTypes.string.isRequired,
  iconClass: PropTypes.string,
  header: PropTypes.bool,
};

DetailCardButton.defaultProps = {
  iconClass: 'fa fa-circle',
  header: true,
};

export function detailHeaderButton(buttonProps) {
  return React.createElement(DetailCardButton, {
    ...buttonProps,
    header: true,
  });
}

export function detailFooterButton(buttonProps) {
  return React.createElement(DetailCardButton, {
    ...buttonProps,
    header: false,
  });
}
