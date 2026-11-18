import React, { Component } from 'react';
import ExplorerComponent from './ExplorerComponent';
import ExplorerFetcher from 'src/fetchers/ExplorerFetcher';
import DetailCard from 'src/apps/mydb/elements/details/DetailCard';
import UIStore from 'src/stores/alt/stores/UIStore';
import { CloseBtn } from './ExplorerComponent';
import positionNodesByReaction from './positionNodesByReaction';

export default class ExplorerContainer extends Component {
  state = { isLoading: true, nodes: [], edges: [], error: null };

  componentDidMount() {
    this.loadExplorerData();
  }

  async loadExplorerData() {
    try {
      const { currentCollection } = UIStore.getState();
      const res = await ExplorerFetcher.fetch({
        collectionId: currentCollection.id,
      });

      const { nodes, edges } = positionNodesByReaction(
        res.samples,
        res.reactions,
        res.molecules
      );

      this.setState({ nodes, edges, isLoading: false });
    } catch (e) {
      this.setState({ error: e, isLoading: false });
    }
  }

  render() {
    const { nodes, edges, isLoading, error } = this.state;
    const { explorer } = this.props;

    if (isLoading) return <div>Loading…</div>;
    if (error) return <div className="text-danger">{error.message}</div>;

    return (
      <DetailCard
        header={
          <div className="d-flex justify-content-between">
            <h4 className="p-2">Explorer</h4>
            <CloseBtn explorer={explorer} />
          </div>
        }
      >
        <ExplorerComponent nodes={nodes} edges={edges} />
      </DetailCard>
    );
  }
}
