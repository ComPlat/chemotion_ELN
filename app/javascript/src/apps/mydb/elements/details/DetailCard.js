import React from 'react';
import PropTypes from 'prop-types';
import cs from 'classnames';
import { Card } from 'react-bootstrap';

export default function DetailCard({
  children, isPendingToSave, header, title, footer
}) {
  const className = cs(
    'detail-card',
    { 'detail-card--unsaved': isPendingToSave }
  );

  return (
    <Card className={className}>
      <Card.Header>{header}</Card.Header>
      <div className="detail-card__scroll-container">
        <Card.Body>
          {title && <Card.Title>{title}</Card.Title>}
          {children}
        </Card.Body>
        {footer && <Card.Footer>{footer}</Card.Footer>}
      </div>
    </Card>
  );
}

DetailCard.propTypes = {
  children: PropTypes.node.isRequired,
  isPendingToSave: PropTypes.bool,
  header: PropTypes.node.isRequired,
  title: PropTypes.node,
  footer: PropTypes.node
};

DetailCard.defaultProps = {
  isPendingToSave: false,
  title: null,
  footer: null
};
