import React, { Component } from 'react';
import ExplorerComponent from './ExplorerComponent';
import ExplorerFetcher from 'src/fetchers/ExplorerFetcher';
import DetailCard from 'src/apps/mydb/elements/details/DetailCard';
import UIStore from 'src/stores/alt/stores/UIStore';
import { CloseBtn } from './ExplorerComponent';

function positionNodesByReaction(samples, reactions, molecules = []) {
  const nodes = [];
  const edges = [];

  const V_BLOCK = 360;
  const V_GAP = 120;
  const H_GAP = 200;
  const BRANCH_X = 320;
  const BRANCH_SIBLING_GAP = 220;

  const sampleById = Object.fromEntries(samples.map((s) => [s.id, s]));
  const moleculeById = Object.fromEntries(molecules.map((m) => [m.id, m]));

  const sortedReactions = [...reactions].sort((a, b) => {
    const aDate = new Date(a.updated_at || a.created_at || 0).getTime();
    const bDate = new Date(b.updated_at || b.created_at || 0).getTime();
    return bDate - aDate;
  });

  const reactionById = Object.fromEntries(sortedReactions.map((r) => [r.id, r]));

  const svgUrlFor = (sid) => {
    const file = sampleById[sid]?.sample_svg_file;
    return file ? `${window.location.origin}/images/samples/${file}` : null;
  };

  const reactionSvgUrlFor = (r) => {
    const file = r.reaction_svg_file;
    return file ? `${window.location.origin}/images/reactions/${file}` : null;
  };

  const sampleSearchData = (sid) => {
    const sample = sampleById[sid] || {};
    const molecule = moleculeById[sample.molecule_id] || {};

    return {
      label: sample.short_label || 'Sample',
      image: svgUrlFor(sid),
      sampleName: sample.name || '',
      sampleShortLabel: sample.short_label || '',
      sampleSmiles: molecule.cano_smiles || '',
    };
  };

  const parentOf = {};
  samples.forEach((s) => {
    if (s.ancestry && s.ancestry !== '/') {
      const parentIdStr = s.ancestry.split('/').filter(Boolean).pop();
      const parentId = Number(parentIdStr);
      if (!Number.isNaN(parentId)) {
        parentOf[s.id] = parentId;
      }
    }
  });

  const getSampleSplitDepth = (sid) => {
    let depth = 0;
    let currentId = sid;
    while (parentOf[currentId]) {
      depth += 1;
      currentId = parentOf[currentId];
    }
    return depth;
  };

  const reactionSamples = {};
  sortedReactions.forEach((r) => {
    reactionSamples[r.id] = new Set([
      ...(r.starting_material_ids || []),
      ...(r.product_ids || []),
    ]);
  });

  const getBranchDirection = (parentReaction, splitSampleId) => {
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

    return direction;
  };

  const reactionParent = {};
  const splitInfoByReaction = {};

  sortedReactions.forEach((r) => {
    const candidateIds = [
      ...(r.starting_material_ids || []),
      ...(r.product_ids || []),
    ];

    const splitSampleIds = candidateIds.filter((sid) => parentOf[sid]);
    if (splitSampleIds.length === 0) return;

    const candidateInfos = [];

    splitSampleIds.forEach((splitSampleId) => {
      const splitParentSampleId = parentOf[splitSampleId];
      const splitDepth = getSampleSplitDepth(splitSampleId);

      sortedReactions.forEach((other) => {
        if (other.id === r.id) return;
        if (!reactionSamples[other.id]?.has(splitParentSampleId)) return;

        candidateInfos.push({
          splitSampleId,
          splitParentSampleId,
          splitDepth,
          parentReactionId: other.id,
        });
      });
    });

    if (candidateInfos.length === 0) return;

    candidateInfos.sort((a, b) => {
      if (a.splitDepth !== b.splitDepth) {
        return a.splitDepth - b.splitDepth;
      }
      return a.parentReactionId - b.parentReactionId;
    });

    const chosen = candidateInfos[0];
    reactionParent[r.id] = chosen.parentReactionId;

    splitInfoByReaction[r.id] = {
      splitSampleId: chosen.splitSampleId,
      splitParentSampleId: chosen.splitParentSampleId,
      splitDepth: chosen.splitDepth,
    };
  });

  const childrenByParent = {};
  sortedReactions.forEach((r) => {
    const parentId = reactionParent[r.id];
    if (!parentId) return;

    if (!childrenByParent[parentId]) {
      childrenByParent[parentId] = [];
    }
    childrenByParent[parentId].push(r.id);
  });

  const siblingReactionGroups = {};
  Object.entries(splitInfoByReaction).forEach(([reactionId, info]) => {
    const parentId = reactionParent[reactionId];
    if (!parentId) return;

    const key = `${parentId}:${info.splitParentSampleId}`;
    if (!siblingReactionGroups[key]) {
      siblingReactionGroups[key] = [];
    }
    siblingReactionGroups[key].push(Number(reactionId));
  });

  const subtreeHeightCache = {};
  function getSubtreeHeight(rid) {
    if (subtreeHeightCache[rid]) return subtreeHeightCache[rid];

    const childIds = childrenByParent[rid] || [];
    if (childIds.length === 0) {
      subtreeHeightCache[rid] = 1;
      return 1;
    }

    const height = 1 + Math.max(...childIds.map((childId) => getSubtreeHeight(childId)));
    subtreeHeightCache[rid] = height;
    return height;
  }

  const blockPos = {};

  function getSiblingBranchOffset(siblingCount, siblingIndex, defaultDirection) {
    if (siblingCount <= 1) {
      return defaultDirection * BRANCH_X;
    }

    if (siblingCount === 2) {
      return siblingIndex === 0 ? -BRANCH_X : BRANCH_X;
    }

    const lane = Math.floor(siblingIndex / 2) + 1;
    const side = siblingIndex % 2 === 0 ? -1 : 1;
    const offset = BRANCH_X + ((lane - 1) * BRANCH_SIBLING_GAP);
    return side * offset;
  }

  function placeReaction(rid) {
    if (blockPos[rid]) return;

    const parentId = reactionParent[rid];
    if (!parentId) return;

    placeReaction(parentId);

    const parentPos = blockPos[parentId];
    const parentReaction = reactionById[parentId];
    const currentSplitInfo = splitInfoByReaction[rid];
    const splitSampleId = currentSplitInfo?.splitSampleId;

    if (!parentPos || !currentSplitInfo || !splitSampleId) return;

    const direction = getBranchDirection(parentReaction, splitSampleId);
    const y = parentPos.y + V_BLOCK;

    const siblingGroupKey = `${parentId}:${currentSplitInfo.splitParentSampleId}`;
    const siblingIds = siblingReactionGroups[siblingGroupKey] || [rid];
    const siblingIndex = siblingIds.indexOf(rid);
    const branchOffset = getSiblingBranchOffset(
      siblingIds.length,
      siblingIndex,
      direction
    );

    const x = parentPos.x + branchOffset;
    blockPos[rid] = { x, y };
  }

  let mainRow = 0;
  sortedReactions.forEach((r) => {
    if (reactionParent[r.id]) return;

    blockPos[r.id] = { x: 0, y: mainRow * V_BLOCK };
    mainRow += getSubtreeHeight(r.id);
  });

  sortedReactions.forEach((r) => {
    placeReaction(r.id);
  });

  const usedSamples = new Set();

  sortedReactions.forEach((r) => {
    const pos = blockPos[r.id];
    if (!pos) return;

    const baseX = pos.x;
    const baseY = pos.y;

    const starting = r.starting_material_ids || [];
    const reagents = r.reactant_ids || [];
    const products = r.product_ids || [];

    starting.forEach((id) => usedSamples.add(id));
    reagents.forEach((id) => usedSamples.add(id));
    products.forEach((id) => usedSamples.add(id));

    const startX = baseX - ((starting.length - 1) * H_GAP) / 2;

    starting.forEach((sid, i) => {
      nodes.push({
        id: `sample-${sid}`,
        type: 'sample',
        position: { x: startX + (i * H_GAP), y: baseY },
        data: sampleSearchData(sid),
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

    const reactionY = baseY + V_GAP;

    nodes.push({
      id: `reaction-${r.id}`,
      type: 'reaction',
      position: { x: baseX, y: reactionY },
      data: {
        label: `${r.short_label || 'Reaction'}${r.name ? `: ${r.name}` : ''}`,
        reactionImage: reactionSvgUrlFor(r),
        reactionName: r.name || '',
        reactionShortLabel: r.short_label || '',
        reactionCreatedAt: r.created_at || null,
        reactionUpdatedAt: r.updated_at || null,
        reactionPerformedAt: r.updated_at || r.created_at || null,
        reactionReagentNodeIds: (reagents || []).map((sid) => `sample-${sid}`),
      },
      style: {
        backgroundColor: '#f87171',
        border: '2px solid #b91c1c',
        color: 'white',
      },
    });

    const REAGENT_NEAR_OFFSET = 160;
    const REAGENT_STEP = 160;

    if (reagents.length === 1) {
      const sid = reagents[0];
      nodes.push({
        id: `sample-${sid}`,
        type: 'sample',
        position: {
          x: baseX + REAGENT_NEAR_OFFSET,
          y: reactionY,
        },
        data: sampleSearchData(sid),
        style: { backgroundColor: '#dbeafe', border: '2px solid #3b82f6' },
      });
    } else if (reagents.length === 2) {
      const leftSid = reagents[0];
      const rightSid = reagents[1];

      nodes.push({
        id: `sample-${leftSid}`,
        type: 'sample',
        position: {
          x: baseX - REAGENT_NEAR_OFFSET,
          y: reactionY,
        },
        data: sampleSearchData(leftSid),
        style: { backgroundColor: '#dbeafe', border: '2px solid #3b82f6' },
      });

      nodes.push({
        id: `sample-${rightSid}`,
        type: 'sample',
        position: {
          x: baseX + REAGENT_NEAR_OFFSET,
          y: reactionY,
        },
        data: sampleSearchData(rightSid),
        style: { backgroundColor: '#dbeafe', border: '2px solid #3b82f6' },
      });
    } else {
      reagents.forEach((sid, i) => {
        nodes.push({
          id: `sample-${sid}`,
          type: 'sample',
          position: {
            x: baseX + REAGENT_NEAR_OFFSET + (i * REAGENT_STEP),
            y: reactionY,
          },
          data: sampleSearchData(sid),
          style: { backgroundColor: '#dbeafe', border: '2px solid #3b82f6' },
        });
      });
    }

    const prodX = baseX - ((products.length - 1) * H_GAP) / 2;

    products.forEach((sid, i) => {
      nodes.push({
        id: `sample-${sid}`,
        type: 'sample',
        position: { x: prodX + (i * H_GAP), y: baseY + (2 * V_GAP) },
        data: sampleSearchData(sid),
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

  let y = 0;
  samples.forEach((s) => {
    if (!usedSamples.has(s.id)) {
      const molecule = moleculeById[s.molecule_id] || {};

      nodes.push({
        id: `unused-${s.id}`,
        type: 'sample',
        position: { x: -850, y },
        data: {
          label: s.short_label || 'Unused Sample',
          image: s.sample_svg_file
            ? `${window.location.origin}/images/samples/${s.sample_svg_file}`
            : null,
          sampleName: s.name || '',
          sampleShortLabel: s.short_label || '',
          sampleSmiles: molecule.cano_smiles || '',
        },
        style: { backgroundColor: '#e5e7eb', border: '1px solid #9ca3af' },
      });
      y += 80;
    }
  });

  return { nodes, edges };
}

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
