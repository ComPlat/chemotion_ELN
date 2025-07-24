import React from 'react';
import PropTypes from 'prop-types';
import {
  Button,
  OverlayTrigger,
  Tooltip,
} from 'react-bootstrap';

function DocumentationButton({
  link,
  overlayMessage,
  size,
  variant,
  className
}) {
  return (
    <OverlayTrigger
      placement="top"
      overlay={<Tooltip id="documentation-tooltip">{overlayMessage}</Tooltip>}
    >
      <Button
        variant={variant}
        size={size}
        href="#"
        onClick={(e) => {
          e.preventDefault();
          window.open(link, '_blank');
        }}
        className={className}
      >
        <i className="fa fa-book me-1" />
        Documentation
      </Button>
    </OverlayTrigger>
  );
}

DocumentationButton.propTypes = {
  link: PropTypes.string.isRequired,
  overlayMessage: PropTypes.string.isRequired,
  size: PropTypes.string,
  variant: PropTypes.string,
  className: PropTypes.string,
};

DocumentationButton.defaultProps = {
  size: 'sm',
  variant: 'outline-info',
  className: '',
};

export default DocumentationButton;
