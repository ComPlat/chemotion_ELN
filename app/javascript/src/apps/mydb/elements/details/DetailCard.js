import React from 'react';
import PropTypes from 'prop-types';
import {
  Card,
  CloseButton,
  OverlayTrigger,
  Tooltip,
} from 'react-bootstrap';

export default function DetailCard({
  children,
  titleIcon,
  title,
  titleTooltip,
  titleAppendix,
  headerToolbar,
  footerToolbar,
  onClose,
  className,
}) {
  const classes = `detail-card${className ? ` ${className}` : ''}`;

  const handleClose = (event) => {
    if (onClose) {
      onClose(event);
    }
  };

  return (
    <Card className={classes}>
      <Card.Header>
        <div className="d-flex align-items-center justify-content-between gap-2">
          <div className="d-flex align-items-center gap-2">
            <div className="d-flex align-items-center me-2">
              {titleIcon && <span className="me-1">{titleIcon}</span>}
              {titleTooltip ? (
                <OverlayTrigger
                  placement="bottom"
                  overlay={<Tooltip id="detail-card-title-tooltip">{titleTooltip}</Tooltip>}
                >
                  <span>{title}</span>
                </OverlayTrigger>
              ) : (
                <span>{title}</span>
              )}
            </div>
            {titleAppendix}
          </div>
          <div className="d-flex gap-1 align-items-center">
            {headerToolbar}
            <CloseButton onClick={handleClose} />
          </div>
        </div>
      </Card.Header>
      <div className="detail-card__scroll-container">
        <Card.Body>
          {children}
        </Card.Body>
        {footerToolbar && (
          <Card.Footer>
            {footerToolbar}
          </Card.Footer>
        )}
      </div>
    </Card>
  );
}

DetailCard.propTypes = {
  children: PropTypes.node.isRequired,
  titleIcon: PropTypes.node,
  title: PropTypes.string.isRequired,
  titleTooltip: PropTypes.string,
  titleAppendix: PropTypes.node,
  headerToolbar: PropTypes.node,
  footerToolbar: PropTypes.node,
  onClose: PropTypes.func,
  className: PropTypes.string,
};

DetailCard.defaultProps = {
  titleIcon: null,
  titleTooltip: null,
  titleAppendix: null,
  headerToolbar: null,
  footerToolbar: null,
  onClose: null,
  className: null,
};
