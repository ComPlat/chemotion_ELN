import React from 'react';
import PropTypes from 'prop-types';
import MlCollectionFetcher from 'src/fetchers/MlCollectionFetcher';
import { rootStore } from 'src/stores/mobx/RootStore';

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

// Everything saved from the prediction UI goes to the user's MLGenerated
// collection. Resolves to { id, label } once it exists; the first time it is
// created the sidebar tree is reloaded so it shows up. Rejects (after telling
// the user) when it cannot be found or created.
export const ensureMlCollection = (collectionsStore) => MlCollectionFetcher.ensure()
  .then((collection) => {
    if (!collection?.id) {
      throw new Error(collection?.error || 'Could not open the MLGenerated collection');
    }
    if (collection.created) {
      collectionsStore?.fetchCollections();
      rootStore.notificationsStore.add({ message: `Created collection "${collection.label}"`, level: 'info' });
    }
    return collection;
  })
  .catch((error) => {
    rootStore.notificationsStore.add({ message: error.message, level: 'error' });
    throw error;
  });

// reactflow (v11) drops the measured size of every node whenever it receives a
// new nodes array, and hides a node until it can measure it again. If that
// happens while the canvas is being re-laid out (e.g. switching collection
// with a node selected), the nodes measure 0x0 and stay hidden. This keeps
// the last real size per node and hands it back with the nodes, and rebuilds
// the array only when the nodes or the selection actually change.
export class PredictionNodeCache {
  sizes = new Map();

  last = { nodes: null, selectedId: null, shown: [] };

  onNodesChange = (changes) => {
    changes.forEach((change) => {
      const { width, height } = change.dimensions || {};
      if (change.type === 'dimensions' && width > 0 && height > 0) {
        this.sizes.set(change.id, { width, height });
      }
    });
  };

  // Forget sizes, e.g. when a new tree replaces the old one.
  clear() {
    this.sizes.clear();
    this.last = { nodes: null, selectedId: null, shown: [] };
  }

  // The nodes to render: measured sizes attached and the selected one marked.
  shownNodes(nodes, selectedId) {
    if (nodes === this.last.nodes && selectedId === this.last.selectedId) return this.last.shown;
    const shown = nodes.map((node) => ({
      ...node,
      ...this.sizes.get(node.id),
      selected: node.id === selectedId,
    }));
    this.last = { nodes, selectedId, shown };
    return shown;
  }
}
