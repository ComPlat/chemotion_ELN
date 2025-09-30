import React from 'react';
import PropTypes from 'prop-types';
import cs from 'classnames';
import { Card } from 'react-bootstrap';

// This component is used to display a single tab in the details view.
// It displays the header and body of the tab and allows the content to
// be scrollable while keeping the tab header fixed.

export default function DetailCard({
  children, isPendingToSave, header, footer
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
  footer: PropTypes.node
};

DetailCard.defaultProps = {
  isPendingToSave: false,
  footer: null
};
