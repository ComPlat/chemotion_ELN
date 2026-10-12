import React, { Component } from 'react';
import { Button } from 'react-bootstrap';
import ReactFlow, {
  ReactFlowProvider, Controls, MiniMap, Background
} from 'reactflow';
import {
  PredictionHelp, PredictionLoading, PredictionToolbar, isAllCollection
} from 'src/apps/mydb/elements/details/predictions/PredictionUI';
import DropTargetMolecule from 'src/apps/mydb/elements/details/predictions/dragNdrop';
import {
  PredictionLegend, PredictionFlowContext, retroNodeTypes
} from 'src/apps/mydb/elements/details/predictions/PredictionNodes';
import ElementActions from 'src/stores/alt/actions/ElementActions';
import UIStore from 'src/stores/alt/stores/UIStore';
import Reaction from 'src/models/Reaction';
import NotificationActions from 'src/stores/alt/actions/NotificationActions';
import RetroActions from 'src/stores/alt/actions/RetroActions';
import RetroStore from 'src/stores/alt/stores/RetroStore';

const FIT_VIEW_OPTIONS = { padding: 0.15 };

class RetroContainer extends Component {
  constructor(props) {
    super(props);
    this.initialState = {
      sample: {},
      reaction: {
        reaction_obj: null, reactants: [], reagents: [], products: []
      },
      // Selection is kept by node id so it survives expanding and folding.
      selectedId: null,
      nodes: [],
      edges: [],
      loading: false,
      success: false
    };
    this.state = this.initialState;

    // One stable value, so the boxes do not re-render on every container render.
    this.treeActions = {
      onExpand: (node) => this.expandNode(node),
      onToggleFold: (id) => RetroActions.toggleFold(id),
    };
    this.flow = null;
    this.fitTimer = null;
  }

  componentDidMount() {
    this.storeListener = RetroStore.listen(this.handleStoreChange);
    this.setState(RetroStore.getState());
  }

  componentDidUpdate(prevProps, prevState) {
    // Folding re-lays the tree while the canvas stays mounted; refit it once
    // the boxes have been measured. Drops and expansions remount the canvas,
    // which fits by itself.
    const canvasStayedMounted = !prevState.loading && !this.state.loading;
    if (prevState.nodes !== this.state.nodes && canvasStayedMounted && this.flow) {
      clearTimeout(this.fitTimer);
      this.fitTimer = setTimeout(() => {
        this.flow?.fitView({ ...FIT_VIEW_OPTIONS, duration: 300 });
      }, 50);
    }
  }

  componentWillUnmount() {
    clearTimeout(this.fitTimer);
    if (this.storeListener) {
      this.storeListener(); // Unsubscribe the listener
    }
  }

  handleStoreChange = (newState) => {
    this.setState(newState);
  };

  clickToReset = () => {
    this.setState(this.initialState);
    RetroActions.resetTree();
  };

  getSelectedNode = () => (
    this.state.nodes.find((node) => node.id === this.state.selectedId) || {}
  );

  handleMoleculeSave = () => {
    const { currentCollection } = UIStore.getState();
    const selectedNode = this.getSelectedNode();
    if (!selectedNode.data?.smiles || selectedNode.type === 'reaction') {
      NotificationActions.add.defer({ message: 'Select a Molecule Node', level: 'error' });
      return;
    }
    if (isAllCollection(currentCollection)) {
      NotificationActions.add.defer({
        message: 'Select a collection',
        level: 'error'
      });
      return;
    }
    RetroActions.handleCreateMolecule(currentCollection, selectedNode.data.smiles);
  };

  handleReactionSave = () => {
    const { currentCollection } = UIStore.getState();
    const selectedNode = this.getSelectedNode();

    if (selectedNode.type !== 'reaction') {
      NotificationActions.add.defer({
        message: 'Select a Reaction Node',
        level: 'error'
      });
      return;
    }

    if (isAllCollection(currentCollection)) {
      NotificationActions.add.defer({
        message: 'Select a collection',
        level: 'error'
      });
      return;
    }

    RetroActions.handleReactionReset();

    const reactionSmiles = selectedNode.data.smiles;
    const parts = reactionSmiles.split('>>');

    const reactants = parts[0] || ''; // Reactants should always be present
    const reagents = selectedNode.data.necessary_reagent || null;

    const fetchSamples = (smilesString, sampleType) => {
      if (!smilesString) return Promise.resolve([]);

      return Promise.all(smilesString.split('.').map((smiles) => (
        RetroActions.createSampleforReaction(currentCollection, smiles, sampleType)
          .catch((error) => {
            console.error(`Error fetching sample for SMILES: ${smiles}`, error);
            return null; // Handle error gracefully
          })
      )));
    };

    const fetchReactantSamples = fetchSamples(reactants, 'reactant');
    const fetchReagentSamples = reagents ? fetchSamples(reagents, 'reagent') : Promise.resolve([]);

    Promise.all([fetchReactantSamples, fetchReagentSamples]).then(([reactantSamples, reagentSamples]) => {
      const newReaction = Reaction.buildEmpty(currentCollection.id);
      // The product is the sample dropped onto the tree root.
      const { sample } = RetroStore.getState();
      newReaction.starting_materials = reactantSamples.filter(Boolean);
      newReaction.products = sample?.id ? [sample] : [];
      newReaction.reagents = reagentSamples.filter(Boolean);

      ElementActions.createReaction(newReaction);
    });
  };

  handleNodeSelect = (event, node) => {
    this.setState({ selectedId: node.id });
  };

  // Double-click finds precursors for a molecule, or hides / shows the branch
  // of one that was already expanded.
  handleNodeDoubleClick = (event, node) => {
    if (node.type !== 'custom') return;
    if (node.data.expanded) {
      RetroActions.toggleFold(node.id);
    } else {
      this.expandNode(node);
    }
  };

  handleChange = (event) => {
    this.setState({ loading: true, selectedId: null });
    RetroActions.handleDrop(event);
  };

  handleNodeExpand = () => {
    this.expandNode(this.getSelectedNode());
  };

  expandNode = (node) => {
    if (node?.type !== 'custom') {
      NotificationActions.add.defer({
        message: 'Select a Molecule Node',
        level: 'error'
      });
      return;
    }
    this.setState({ loading: true, selectedId: node.id });
    RetroActions.handleNodeExpand(node);
  };

  render() {
    const {
      nodes, edges, selectedId, loading, success
    } = this.state;
    const selectedType = this.getSelectedNode().type;
    const isMoleculeSelected = selectedType === 'custom' || selectedType === 'root';
    // reactflow draws its selection from the nodes; mark the chosen one.
    const shownNodes = selectedId
      ? nodes.map((node) => (node.id === selectedId ? { ...node, selected: true } : node))
      : nodes;

    return (
      <div>
        {loading && <PredictionLoading label="Searching retrosynthesis tree…" />}
        {!loading && (
          <div>
            <PredictionHelp>
              Perform retro synthesis. Drag and drop a sample into the drop field. Click a molecule and use
              Save Molecule to keep it, or click a reaction and use Save Reaction. Use + (or double-click a
              molecule) to find its precursors, and the arrow to hide or show a branch. Hover a box for details.
              Everything is saved to the currently selected collection.
            </PredictionHelp>
            <div className="dropzone">
              <DropTargetMolecule onChange={this.handleChange} />
            </div>
            <PredictionToolbar>
              <Button
                variant="outline-primary"
                size="sm"
                onClick={this.handleMoleculeSave}
                title="Save the selected molecule to the current collection"
                disabled={!success || !isMoleculeSelected}
              >
                <i className="fa fa-floppy-o me-1" aria-hidden="true" />
                Save Molecule
              </Button>
              <Button
                variant="outline-primary"
                size="sm"
                onClick={this.handleReactionSave}
                title="Save the selected reaction to the current collection"
                disabled={selectedType !== 'reaction'}
              >
                <i className="fa fa-floppy-o me-1" aria-hidden="true" />
                Save Reaction
              </Button>
              <Button
                variant="primary"
                size="sm"
                onClick={this.handleNodeExpand}
                title="Find precursors for the selected molecule"
                disabled={selectedType !== 'custom'}
              >
                <i className="fa fa-sitemap me-1" aria-hidden="true" />
                Expand Molecule
              </Button>
              <Button variant="outline-secondary" size="sm" className="ms-auto" onClick={this.clickToReset}>
                <i className="fa fa-eraser me-1" aria-hidden="true" />
                Reset
              </Button>
            </PredictionToolbar>
            <div className="prediction-flow">
              <PredictionFlowContext.Provider value={this.treeActions}>
                <ReactFlowProvider>
                  <ReactFlow
                    nodes={shownNodes}
                    edges={edges}
                    nodeTypes={retroNodeTypes}
                    nodeOrigin={[0, 0.5]}
                    nodesDraggable={false}
                    nodesConnectable={false}
                    zoomOnDoubleClick={false}
                    onInit={(instance) => { this.flow = instance; }}
                    onNodeClick={this.handleNodeSelect}
                    onNodeDoubleClick={this.handleNodeDoubleClick}
                    onPaneClick={() => this.setState({ selectedId: null })}
                    fitView
                    fitViewOptions={FIT_VIEW_OPTIONS}
                    minZoom={0.1}
                  >
                    <MiniMap minZoom={0.3} />
                    <Controls />
                    <Background color="#aaa" gap={16} />
                  </ReactFlow>
                </ReactFlowProvider>
              </PredictionFlowContext.Provider>
              {nodes.length > 0 && <PredictionLegend variant="retro" />}
            </div>
          </div>
        )}
      </div>
    );
  }
}

export default RetroContainer;
