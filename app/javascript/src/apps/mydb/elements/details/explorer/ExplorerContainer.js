import React, { Component } from 'react';
import ExplorerComponent from './ExplorerComponent';
import ExplorerFetcher from 'src/fetchers/ExplorerFetcher';
import DetailCard from 'src/apps/mydb/elements/details/DetailCard';
// import DetailActions from 'src/stores/alt/actions/DetailActions';
import UIStore from 'src/stores/alt/stores/UIStore';
import { CloseBtn } from 'src/apps/mydb/elements/details/explorer/ExplorerComponent';
import { captureConsoleIntegration } from '@sentry/react';


/**
 * Position nodes in a structured layered layout:
 * - Molecules → left column
 * - Samples → middle column
 * - Reactions → right column
 */
function positionNodes(samples, reactions, molecules) {
  const spacingX = 300;
  const spacingY = 150;

  const splitSamples = samples.filter((s) => s.ancestry && s.ancestry !== '/');
  const normalSamples = samples.filter((s) => !s.ancestry || s.ancestry === '/');

  const moleculeNodes = molecules.map((m, i) => ({
    id: `molecule-${m.id}`,
    type: 'molecule',
    position: { x: 0 * spacingX, y: i * spacingY },
    data: { label: m.iupac_name || m.cano_smiles || m.inchikey || 'Molecule' },
    style: { backgroundColor: '#B3E5FC', border: '2px solid #0288D1'},
  }));

  const sampleNodes = normalSamples.map((s, i) => ({
    id: `sample-${s.id}`,
    type: 'sample',
    position: { x: 1 * spacingX, y: i * spacingY },
    data: { label: s.short_label || 'Sample' },
    style: { backgroundColor: '#fce5b3ff', border: '2px solid #eb9800ff'},
  }));
  
  const splitSampleNodes = splitSamples.map((s, i) => ({
    id: `sample-${s.id}`,
    type: 'splitsample',
    position: { x: 2 * spacingX, y: i * spacingY },
    data: { label: s.short_label || 'Split Sample' },
    style: { backgroundColor: '#fce5b3ff', border: '2px solid #e6dccaff'},
  }));

  const reactionNodes = reactions.map((r, i) => ({
    id: `reaction-${r.id}`,
    type: 'reaction',
    position: { x: 3 * spacingX, y: i * spacingY },
    data: { label: r.name || r.short_label || 'Reaction' },
  }));

  return [...moleculeNodes, ...sampleNodes, ...splitSampleNodes, ...reactionNodes];
}

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

      // --- Use structured layered layout ---
      const positionedNodes = positionNodes(samples, reactions, molecules);

      // --- Build edges ---
      const edges = [
        ...samples
          .filter((s) => s.molecule_id && (!s.ancestry || s.ancestry === '/'))
          .map((s) => ({
            id: `edge-sample-${s.id}-mol-${s.molecule_id}`,
            source: `molecule-${s.molecule_id}`,
            target: `sample-${s.id}`,
          })),
      ];

      const ancestryEdges = [
        ...samples
          .filter((s) => s.ancestry && s.ancestry !== '/')
          .map((child) => {
            const parentId = child.ancestry.split('/').filter(Boolean).pop();
            return {
              id: `edge-parent-${parentId}-child-${child.id}`,
              source: `sample-${parentId}`,
              target: `sample-${child.id}`,
              label: 'split from',
            };
          }),
      ];

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
        nodes: positionedNodes,
        edges: [...edges, ...ancestryEdges, ...startingEdges, ...productEdges],
        isLoading: false,
      });
    } catch (error) {
      console.error('Error loading explorer data:', error);
      this.setState({ error, isLoading: false });
    }
  }

  explorerHeader(explorer) {
    return (
      <div className='d-flex align-items-center justify-content-between'>
        <h4 className="p-2">Explorer</h4>
        <div className="d-flex gap-1">
          <CloseBtn key="closeBtn" explorer={explorer} />
        </div>
      </div>
    );
  }

  render() {
    const { isLoading, error, nodes, edges } = this.state;
    const { explorer } = this.props;
    console.log(explorer);

    if (isLoading) return <div>Loading Explorer Graph...</div>;
    if (error) return <div className="text-danger">Failed to load data: {error.message}</div>;

    return (
      <DetailCard header={this.explorerHeader(explorer)}>
        <ExplorerComponent
          explorer={explorer}
          nodes={nodes}
          edges={edges}
        />
      </DetailCard>
    );
  }
}
