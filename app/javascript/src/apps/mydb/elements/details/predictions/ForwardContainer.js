import React, { Component } from 'react';
import { Button } from 'react-bootstrap';
import ReactFlow, {
  ReactFlowProvider, Controls, MiniMap, Background
} from 'reactflow';
import {
  PredictionHelp, PredictionLoading, PredictionToolbar, ensureMlCollection, PredictionNodeCache
} from 'src/apps/mydb/elements/details/predictions/PredictionUI';
import {
  PredictionLegend, PredictionFlowContext, forwardNodeTypes
} from 'src/apps/mydb/elements/details/predictions/PredictionNodes';
import { StoreContext } from 'src/stores/mobx/RootStore';
import NotificationActions from 'src/stores/alt/actions/NotificationActions';
import ForwardStore from 'src/stores/alt/stores/ForwardStore';
import ForwardActions from 'src/stores/alt/actions/ForwardActions';

const FIT_VIEW_OPTIONS = { padding: 0.15 };
// Fetched in one go (cheap compared to the per-product images and vendor
// lookups the backend adds); the canvas reveals them five at a time.
const NUM_RESULTS = 25;

class ForwardContainer extends Component {
  // The MobX root store, used to reload the sidebar collection tree.
  static contextType = StoreContext;

  constructor(props) {
    super(props);
    this.state = {
      ...ForwardStore.getState(),
      // Selection is kept by node id; only predicted products can be selected.
      selectedId: null,
    };

    // One stable value, so the boxes do not re-render on every container render.
    this.flowActions = {
      onDropSample: (label, event) => ForwardActions.handleChange(event.sample_id, { label }),
      onShowMore: () => ForwardActions.showMoreOutcomes(),
    };
    this.nodeCache = new PredictionNodeCache();
    this.flow = null;
    this.fitTimer = null;
  }

  componentDidMount() {
    this.storeListener = ForwardStore.listen(this.handleStoreChange);
  }

  componentDidUpdate(prevProps, prevState) {
    // Dropping an input re-lays the canvas while it stays mounted; refit once
    // the boxes have been measured. A prediction remounts it, which fits by itself.
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
    this.setState({ selectedId: null });
    ForwardActions.resetForward();
    this.nodeCache.clear();
  };

  getSelectedNode = () => (
    this.state.nodes.find((node) => node.id === this.state.selectedId) || {}
  );

  handleSynthesize = () => {
    const { reactant, reagent, solvent } = ForwardStore.getState();
    const smilesOf = (sample) => sample?.molecule?.cano_smiles || '';
    if (!smilesOf(reactant)) {
      NotificationActions.add.defer({ message: 'Drop a reactant first', level: 'error' });
      return;
    }

    this.setState({ loading: true, selectedId: null });
    // The API requires every field; the prediction server treats '' as "none".
    ForwardActions.fetchApiResponse({
      reactant: smilesOf(reactant),
      reagent: smilesOf(reagent),
      solvent: smilesOf(solvent),
      num_res: String(NUM_RESULTS),
      flag: false
    });
  };

  handleNodeSelect = (event, node) => {
    if (node.type === 'outcome') this.setState({ selectedId: node.id });
  };

  // Saves always go to the user's MLGenerated collection (created on first save).
  handleMoleculeSave = () => {
    const selectedNode = this.getSelectedNode();
    if (selectedNode.type !== 'outcome') {
      NotificationActions.add.defer({ message: 'Select a predicted product', level: 'error' });
      return;
    }
    ensureMlCollection(this.context?.collections)
      .then((collection) => ForwardActions.handleSave(collection, selectedNode))
      .catch(() => {}); // already reported by ensureMlCollection
  };

  render() {
    const {
      nodes, edges, selectedId, loading, inputs, outcomes
    } = this.state;
    const hasReactant = Boolean(inputs?.Reactant?.smiles);
    // reactflow draws its selection from the nodes; mark the chosen one.
    const shownNodes = this.nodeCache.shownNodes(nodes, selectedId);

    return (
      <div>
        {loading && <PredictionLoading label="Running forward synthesis…" />}
        {!loading && (
          <div>
            <PredictionHelp>
              Perform single step forward synthesis. Drag and drop a sample onto Reactant, and optionally onto
              Reagent and Solvent (one sample each), then click Synthesize. The top 5 products are shown; use
              Show more for the next 5. Hover a product for its vendors and prices; click one and use Save
              Molecule to save it to your MLGenerated collection (created on first save).
            </PredictionHelp>
            <PredictionToolbar>
              <Button
                variant="primary"
                size="sm"
                onClick={this.handleSynthesize}
                disabled={!hasReactant}
                title={hasReactant ? 'Predict the products' : 'Drop a reactant first'}
              >
                <i className="fa fa-flask me-1" aria-hidden="true" />
                Synthesize
              </Button>
              <Button
                variant="outline-primary"
                size="sm"
                onClick={this.handleMoleculeSave}
                disabled={this.getSelectedNode().type !== 'outcome'}
                title="Save the selected product to the MLGenerated collection"
              >
                <i className="fa fa-floppy-o me-1" aria-hidden="true" />
                Save Molecule
              </Button>
              <Button variant="outline-secondary" size="sm" className="ms-auto" onClick={this.clickToReset}>
                <i className="fa fa-eraser me-1" aria-hidden="true" />
                Reset
              </Button>
            </PredictionToolbar>
            <div className="prediction-flow">
              <PredictionFlowContext.Provider value={this.flowActions}>
                <ReactFlowProvider>
                  <ReactFlow
                    nodes={shownNodes}
                    edges={edges}
                    nodeTypes={forwardNodeTypes}
                    nodeOrigin={[0, 0.5]}
                    onNodesChange={this.nodeCache.onNodesChange}
                    nodesDraggable={false}
                    nodesConnectable={false}
                    zoomOnDoubleClick={false}
                    onInit={(instance) => { this.flow = instance; }}
                    onNodeClick={this.handleNodeSelect}
                    onPaneClick={() => this.setState({ selectedId: null })}
                    fitView
                    fitViewOptions={FIT_VIEW_OPTIONS}
                    minZoom={0.1}
                  >
                    <MiniMap minZoom={0.2} />
                    <Controls />
                    <Background color="#aaa" gap={16} />
                  </ReactFlow>
                </ReactFlowProvider>
              </PredictionFlowContext.Provider>
              {outcomes?.length > 0 && <PredictionLegend variant="forward" />}
            </div>
          </div>
        )}
      </div>
    );
  }
}

export default ForwardContainer;
