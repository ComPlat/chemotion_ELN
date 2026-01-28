import React, { Component } from 'react';
import ExplorerComponent from './ExplorerComponent';
import ExplorerFetcher from 'src/fetchers/ExplorerFetcher';
import DetailCard from 'src/apps/mydb/elements/details/DetailCard';
import UIStore from 'src/stores/alt/stores/UIStore';
import { CloseBtn } from './ExplorerComponent';

function positionNodesByReaction(samples, reactions) {
  const nodes = [];
  const edges = [];

  const V_BLOCK = 360;
  const V_GAP = 120;
  const H_GAP = 200;
  const BRANCH_X = 320;

  const sampleById = Object.fromEntries(samples.map(s => [s.id, s]));

  /* ---------------- parent sample lookup ---------------- */

  const parentOf = {};
  samples.forEach(s => {
    if (s.ancestry && s.ancestry !== '/') {
      parentOf[s.id] = s.ancestry.split('/').filter(Boolean).pop();
    }
  });

  /* ---------------- reaction → samples ---------------- */

  const reactionSamples = {};
  reactions.forEach(r => {
    reactionSamples[r.id] = new Set([
      ...(r.starting_material_ids || []),
      ...(r.product_ids || []),
    ]);
  });

  /* ---------------- reaction → parent reaction ---------------- */

  const reactionParent = {};
  reactions.forEach(r => {
    for (const sid of reactionSamples[r.id]) {
      const parentSample = parentOf[sid];
      if (!parentSample) continue;

      for (const other of reactions) {
        if (
          other.id !== r.id &&
          reactionSamples[other.id].has(parentSample)
        ) {
          reactionParent[r.id] = other.id;
          return;
        }
      }
    }
  });

  /* ---------------- recursive reaction placement ---------------- */

  const blockPos = {};
  let rootIndex = 0;

  function placeReaction(rid) {
    if (blockPos[rid]) return;

    const parentId = reactionParent[rid];

    // root reaction
    if (!parentId) {
      blockPos[rid] = { x: 0, y: rootIndex * V_BLOCK };
      rootIndex++;
      return;
    }

    // ensure parent is placed first
    placeReaction(parentId);

    const parentPos = blockPos[parentId];
    const parentReaction = reactions.find(r => r.id === parentId);

    // find the split sample USED BY THIS reaction
    const splitSampleId = [...reactionSamples[rid]].find(
      sid => parentOf[sid]
    );

    let direction = -1;

    if (splitSampleId && parentReaction) {
      const parentSampleId = parentOf[splitSampleId];

      if (parentReaction.product_ids?.includes(parentSampleId)) {
        direction =
          parentReaction.product_ids.indexOf(parentSampleId) === 0 ? -1 : 1;
      }

      if (parentReaction.starting_material_ids?.includes(parentSampleId)) {
        direction =
          parentReaction.starting_material_ids.indexOf(parentSampleId) === 0
            ? -1
            : 1;
      }
    }

    blockPos[rid] = {
      x: parentPos.x + direction * BRANCH_X,
      y: parentPos.y + V_BLOCK,
    };
  }

  reactions.forEach(r => placeReaction(r.id));

  /* ---------------- render reaction blocks ---------------- */

  const usedSamples = new Set();

  reactions.forEach(r => {
    const pos = blockPos[r.id];
    if (!pos) return;

    const baseX = pos.x;
    const baseY = pos.y;

    const starting = r.starting_material_ids || [];
    const products = r.product_ids || [];

    starting.forEach(id => usedSamples.add(id));
    products.forEach(id => usedSamples.add(id));

    const startX = baseX - ((starting.length - 1) * H_GAP) / 2;

    starting.forEach((sid, i) => {
      nodes.push({
        id: `sample-${sid}`,
        type: 'sample',
        position: { x: startX + i * H_GAP, y: baseY },
        data: { label: sampleById[sid]?.short_label || 'Sample' },
        style: { backgroundColor: '#fce5b3', border: '2px solid #eb9800' },
      });

      edges.push({
        id: `edge-start-${sid}-${r.id}`,
        source: `sample-${sid}`,
        target: `reaction-${r.id}`,
      });
    });

    nodes.push({
      id: `reaction-${r.id}`,
      type: 'reaction',
      position: { x: baseX, y: baseY + V_GAP },
      data: { label: r.name || r.short_label || 'Reaction' },
      style: {
        backgroundColor: '#f87171',
        border: '2px solid #b91c1c',
        color: 'white',
      },
    });

    const prodX = baseX - ((products.length - 1) * H_GAP) / 2;

    products.forEach((sid, i) => {
      nodes.push({
        id: `sample-${sid}`,
        type: 'sample',
        position: { x: prodX + i * H_GAP, y: baseY + 2 * V_GAP },
        data: { label: sampleById[sid]?.short_label || 'Sample' },
        style: { backgroundColor: '#fce5b3', border: '2px solid #eb9800' },
      });

      edges.push({
        id: `edge-prod-${r.id}-${sid}`,
        source: `reaction-${r.id}`,
        target: `sample-${sid}`,
      });
    });
  });

  /* ---------------- ancestry edges ---------------- */

  Object.entries(parentOf).forEach(([child, parent]) => {
    edges.push({
      id: `edge-split-${parent}-${child}`,
      source: `sample-${parent}`,
      target: `sample-${child}`,
    });
  });

  /* ---------------- unused samples ---------------- */

  let y = 0;
  samples.forEach(s => {
    if (!usedSamples.has(s.id)) {
      nodes.push({
        id: `unused-${s.id}`,
        type: 'sample',
        position: { x: -600, y },
        data: { label: s.short_label || 'Unused Sample' },
        style: { backgroundColor: '#e5e7eb', border: '1px solid #9ca3af' },
      });
      y += 80;
    }
  });

  return { nodes, edges };
}

/* ================== CONTAINER ================== */

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
        res.reactions
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
