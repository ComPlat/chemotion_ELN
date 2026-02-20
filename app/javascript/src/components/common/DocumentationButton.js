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
  className,
  omitDocumentationWord
}) {
  const btnClass = omitDocumentationWord
    ? `${className} d-flex justify-content-center`.trim()
    : className;
  const iconClass = omitDocumentationWord ? 'fa fa-book' : 'fa fa-book me-1';

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
        className={btnClass}
      >
        <i className={iconClass} />
        {!omitDocumentationWord && 'Documentation'}
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
  omitDocumentationWord: PropTypes.bool,
};

DocumentationButton.defaultProps = {
  size: 'sm',
  variant: 'outline-info',
  className: '',
  omitDocumentationWord: false,
};

export default DocumentationButton;
