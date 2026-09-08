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
  headerBanner,
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
        <div className="d-flex align-items-center">
          <div className="d-flex align-items-center justify-content-between gap-2 flex-wrap flex-grow-1">
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
            <div className="d-flex align-items-center gap-1">
              {headerToolbar}
            </div>
          </div>
          <CloseButton onClick={handleClose} />
        </div>
        {headerBanner && (
          <div className="detail-card__header-banner mt-2">
            {headerBanner}
          </div>
        )}
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
  title: PropTypes.node.isRequired,
  titleTooltip: PropTypes.string,
  titleAppendix: PropTypes.node,
  headerToolbar: PropTypes.node,
  headerBanner: PropTypes.node,
  footerToolbar: PropTypes.node,
  onClose: PropTypes.func,
  className: PropTypes.string,
};

DetailCard.defaultProps = {
  titleIcon: null,
  titleTooltip: null,
  titleAppendix: null,
  headerToolbar: null,
  headerBanner: null,
  footerToolbar: null,
  onClose: null,
  className: null,
};
