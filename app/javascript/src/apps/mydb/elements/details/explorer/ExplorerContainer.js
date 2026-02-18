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
  const MIN_ROW_GAP = 480;

  const sampleById = Object.fromEntries(samples.map(s => [s.id, s]));

  const svgUrlFor = (sid) => {
    const file = sampleById[sid]?.sample_svg_file;
    return file ? `${window.location.origin}/images/samples/${file}` : null;
  };

  const reactionSvgUrlFor = (r) => {
    const file = r.reaction_svg_file;
    return file ? `${window.location.origin}/images/reactions/${file}` : null;
  };

  /* ---------------- parent sample lookup ---------------- */
  const parentOf = {};
  samples.forEach(s => {
    if (s.ancestry && s.ancestry !== '/') {
      const parentIdStr = s.ancestry.split('/').filter(Boolean).pop();
      const parentId = Number(parentIdStr);
      if (!Number.isNaN(parentId)) {
        parentOf[s.id] = parentId;
      }
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
    const starting = r.starting_material_ids || [];
    const splitSampleId = starting.find(sid => parentOf[sid]);
    if (!splitSampleId) return;

    const parentSampleId = parentOf[splitSampleId];

    for (const other of reactions) {
      if (other.id === r.id) continue;
      if (reactionSamples[other.id]?.has(parentSampleId)) {
        reactionParent[r.id] = other.id;
        break;
      }
    }
  });

  /* ---------------- recursive reaction placement ---------------- */
  const blockPos = {};
  let rootIndex = 0;

  function resolveRowCollision(x, y, direction) {
    let nextX = x;
    let safe = false;
    while (!safe) {
      safe = true;
      for (const otherId in blockPos) {
        const p = blockPos[otherId];
        if (p.y !== y) continue;
        if (Math.abs(p.x - nextX) < MIN_ROW_GAP) {
          safe = false;
          nextX += direction * MIN_ROW_GAP;
          break;
        }
      }
    }
    return nextX;
  }

  function placeReaction(rid) {
    if (blockPos[rid]) return;

    const parentId = reactionParent[rid];

    if (!parentId) {
      const x = resolveRowCollision(0, rootIndex * V_BLOCK, 1);
      blockPos[rid] = { x, y: rootIndex * V_BLOCK };
      rootIndex++;
      return;
    }

    placeReaction(parentId);

    const parentPos = blockPos[parentId];
    const parentReaction = reactions.find(r => r.id === parentId);

    const currentReaction = reactions.find(r => r.id === rid);
    const splitSampleId =
      (currentReaction?.starting_material_ids || []).find(sid => parentOf[sid]);

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

    let x = parentPos.x + direction * BRANCH_X;
    const y = parentPos.y + V_BLOCK;
    x = resolveRowCollision(x, y, direction);

    blockPos[rid] = { x, y };
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
        data: {
          label: sampleById[sid]?.short_label || 'Sample',
          image: svgUrlFor(sid),
        },
        style: { backgroundColor: '#fce5b3', border: '2px solid #eb9800' },
      });

      edges.push({
        id: `edge-start-${sid}-${r.id}`,
        source: `sample-${sid}`,
        target: `reaction-${r.id}`,
        label: 'has starting material',
        labelStyle: { fontSize: 10, fill: '#4338ca' },
        style: { stroke: '#4338ca', strokeWidth: 2 },
      });
    });

    nodes.push({
      id: `reaction-${r.id}`,
      type: 'reaction',
      position: { x: baseX, y: baseY + V_GAP },
      data: {
        label: `${r.short_label || 'Reaction'}${r.name ? `: ${r.name}` : ''}`,
        reactionImage: reactionSvgUrlFor(r),      // NEW
        reactionName: r.name || '',               // NEW
        reactionShortLabel: r.short_label || '',  // NEW
      },
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
        data: {
          label: sampleById[sid]?.short_label || 'Sample',
          image: svgUrlFor(sid),
        },
        style: { backgroundColor: '#fce5b3', border: '2px solid #eb9800' },
      });

      edges.push({
        id: `edge-prod-${r.id}-${sid}`,
        source: `reaction-${r.id}`,
        target: `sample-${sid}`,
        label: 'has product',
        labelStyle: { fontSize: 12, fill: '#16a34a' },
        style: { stroke: '#16a34a', strokeWidth: 2 },
      });
    });
  });

  /* ---------------- ancestry edges ---------------- */
  Object.entries(parentOf).forEach(([child, parent]) => {
    edges.push({
      id: `edge-split-${parent}-${child}`,
      source: `sample-${parent}`,
      target: `sample-${child}`,
      label: 'has split sample',
      labelStyle: { fontSize: 10, fill: '#6b7280' },
      style: { stroke: '#6b7280', strokeWidth: 1.5 },
    });
  });

  /* ---------------- unused samples ---------------- */
  let y = 0;
  samples.forEach(s => {
    if (!usedSamples.has(s.id)) {
      nodes.push({
        id: `unused-${s.id}`,
        type: 'sample',
        position: { x: -850, y },
        data: {
          label: s.short_label || 'Unused Sample',
          image: s.sample_svg_file
            ? `${window.location.origin}/images/samples/${s.sample_svg_file}`
            : null,
        },
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
