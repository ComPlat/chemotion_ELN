import React, { Component } from 'react';
import ExplorerComponent from './ExplorerComponent';
import ExplorerFetcher from 'src/fetchers/ExplorerFetcher';
import DetailActions from 'src/stores/alt/actions/DetailActions';
import UIStore from 'src/stores/alt/stores/UIStore';
import { captureConsoleIntegration } from '@sentry/react';

export default class ExplorerContainer extends Component {
  constructor(props) {
    super(props);
    this.state = {
      isLoading: true,
      error: null,
      nodes: [],
      edges: [],
    };
  }

  componentDidMount() {
    this.loadExplorerData();
  }

  async loadExplorerData() {
    try {
      const { currentCollection } = UIStore.getState();
      const collectionId = currentCollection.id;
      console.log("Collection Id from EXLORER CONTAINER", collectionId);

      const response = await ExplorerFetcher.fetch({ collectionId });

      const { samples, reactions, molecules } = response;

      // --- Transform into React Flow compatible nodes and edges ---
      const sampleNodes = samples.map((s) => ({
        id: `sample-${s.id}`,
        type: 'default',
        position: { x: Math.random() * 400, y: Math.random() * 400 },
        data: { label: ` ${s.short_label || 'Sample'}` },
      }));

      const reactionNodes = reactions.map((r) => ({
        id: `reaction-${r.id}`,
        type: 'default',
        position: { x: Math.random() * 400 + 400, y: Math.random() * 400 },
        data: { label: `⚗️ ${r.name || r.short_label || 'Reaction'}` },
      }));

      const moleculeNodes = molecules.map((m) => ({
        id: `molecule-${m.id}`,
        type: 'default',
        position: { x: Math.random() * 400 + 200, y: Math.random() * 400 + 300 },
        data: { label: ` ${m.iupac_name || m.cano_smiles || m.inchikey || 'Molecule'}` },
      }));


      // Example edges: link samples → molecules and reactions → samples
      const edges = [
        ...samples
          .filter((s) => s.molecule_id && (!s.ancestry || s.ancestry === '/'))
          .map((s) => ({
            id: `edge-sample-${s.id}-mol-${s.molecule_id}`,
            source: `sample-${s.id}`,
            target: `molecule-${s.molecule_id}`,
          })),
      ];

      // Parent Sample → Split Sample (ancestry) edges
      const ancestryEdges = [
        ...samples
        .filter((s) => s.ancestry && s.ancestry !== '/')
        .map((child) => {
          const parentId = child.ancestry.split('/').filter(Boolean).pop();
          return {
            id: `edge-parent-${parentId}-child-${child.id}`,
            source: `sample-${parentId}`,
            target: `sample-${child.id}`,
            // type: 'smoothstep',
            // animated: true,
            label: 'split from',
          };
        }),
      ];

      // Starting Material → Reaction
      const startingEdges = reactions.flatMap((r) =>
        (r.starting_material_ids || []).map((sid) => ({
          id: `edge-starting-${sid}-to-reaction-${r.id}`,
          source: `sample-${sid}`,
          target: `reaction-${r.id}`,
          label: 'starting material',
          animated: true,
          style: { stroke: '#2563eb' }, // blue
        }))
      );

      // Reaction → Product
      const productEdges = reactions.flatMap((r) =>
        (r.product_ids || []).map((sid) => ({
          id: `edge-reaction-${r.id}-to-product-${sid}`,
          source: `reaction-${r.id}`,
          target: `sample-${sid}`,
          label: 'product',
          animated: true,
          style: { stroke: '#10b981' }, // green
        }))
      );

      this.setState({
        nodes: [...sampleNodes, ...moleculeNodes, ...reactionNodes],
        edges: [...edges, ...ancestryEdges, ...startingEdges, ...productEdges],
        isLoading: false,
      });
    } catch (error) {
      console.error('Error loading explorer data:', error);
      this.setState({ error, isLoading: false });
    }
  }

  render() {
    const { isLoading, error, nodes, edges } = this.state;
    // const { explorer } = this.props;
    // console.log(explorer);

    if (isLoading) return <div>Loading Explorer Graph...</div>;
    if (error) return <div className="text-danger">Failed to load data: {error.message}</div>;

    return (
      <ExplorerComponent
        // explorer={explorer}
        nodes={nodes}
        edges={edges}
      />
    );
  }
}
