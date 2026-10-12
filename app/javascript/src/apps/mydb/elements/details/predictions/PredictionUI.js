import React from 'react';
import PropTypes from 'prop-types';

/**
 * Presentational primitives shared by the Forward / Retro / Impurity
 * containers. Each of them previously repeated the same inline-styled help
 * banner, loading block and action row; this keeps them consistent and moves
 * the styling into legacy/prediction.scss.
 */

export const PredictionHelp = ({ children }) => (
  <div className="prediction-help">
    <i className="fa fa-info-circle" aria-hidden="true" />
    <span>{children}</span>
  </div>
);

PredictionHelp.propTypes = {
  children: PropTypes.node.isRequired,
};

export const PredictionLoading = ({ label }) => (
  <div className="prediction-loading">
    <img src="/images/wild_card/loading-bubbles.svg" alt="" />
    <span className="prediction-loading__label">{label}</span>
  </div>
);

PredictionLoading.propTypes = {
  label: PropTypes.string,
};

PredictionLoading.defaultProps = {
  label: 'Working…',
};

export const PredictionToolbar = ({ children }) => (
  <div className="prediction-toolbar">{children}</div>
);

PredictionToolbar.propTypes = {
  children: PropTypes.node.isRequired,
};

// Saving needs a real target collection; the locked "All" collection is not one.
export const isAllCollection = (collection) => Boolean(
  collection?.is_locked && collection?.label === 'All'
);
