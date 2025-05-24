import React, { Component, useState, useCallback } from 'react';
import { Button } from 'react-bootstrap';
import DropTargetMolecule from './dragNdrop';
import ReactFlow, { ReactFlowProvider, Controls, MiniMap, Background, Handle, Position} from 'reactflow';
import ButtonEdge from './ButtonEdge';
import UIStore from 'src/stores/alt/stores/UIStore';
import ForwardStore from 'src/stores/alt/stores/ForwardStore';
import ForwardActions from 'src/stores/alt/actions/ForwardActions';

class ForwardContainer extends Component {
  constructor(props) {
    super(props);
    this.initialState = {
      target: '',
      idle: true,
      sample: {},
      newSample : {},
      nodes: [{
        id: 'Reactant',
        type: 'input',
        data: { label: 'Reactant' },
        width: 100,
        height: 200,
        position: { x: 0, y: 0 },
      },
      {
        id: 'Reagent',
        type: 'input',
        data: { label: 'Reagent' },
        position: { x: 0, y: 250 },
      }, {
        id: 'Solvent',
        type: 'input',
        data: { label: 'Solvent' },
        position: { x: 0, y: 500 },
      }, {
        id: 'Synthesis',
        type: 'synthesis',
        data: { label: 'synthesis' },
        position: { x: 300, y: 250 },
      }

      ],
      edges: [
        {
          id: 're-sy',
          source: 'Reactant',
          target: 'Synthesis',
          animated: true,
        },
        {
          id: 'reag-sy',
          source: 'Reagent',
          target: 'Synthesis',
          animated: true,
        },
        {
          id: 'sol-sy',
          source: 'Solvent',
          target: 'Synthesis',
          animated: true,
        }

      ],
      tree: {},
      showSVG: false,
      hoveredNode: null,
      pngBackground: "",
      treeData: { nodes: [], edges: [] },
      loading: false,
      selectedNode: {},
      reactants: [],
      reagents : [],
      solvents :[]


    };

    this.state = this.initialState;
    this.handleChange = this.handleChange.bind(this);
  }

  componentDidMount() {
    this.storeListener = ForwardStore.listen(this.handleStoreChange);
    const initialState = ForwardStore.getState();
    this.setState(initialState);  
    }

  // Unsubscribe from store updates when the component unmounts
  componentWillUnmount() {
    if (this.storeListener) {
      this.storeListener();  // Unsubscribe the listener
    }
  }

  clickToReset = () => {
    this.setState(
      {
        ...this.initialState, 
        nodes: this.initialState.nodes.map((node) => ({
          ...node, 
          data: { label : node.data.label }, 
        })),
      },
      () => {
        console.log(this.state, 'State after reset');
      }
    );
  };

  handleStoreChange = (newState) => {
      // Update the component's state with the new store state
        this.setState(newState);
      };
    

  clickToReset = () => {
      this.setState(this.initialState);
    };
  
  handleChange = (event, data) => {
        const sampleId = event.sample_id;
        ForwardActions.handleChange(sampleId, data);
      };
  
  handleSynthesize = () => {
        const state = ForwardStore.getState(); // Get current state
        this.setState({ nodes: state.nodes.slice(3), loading: true });
            // Construct request parameters
            const params = {
              reactant: state.reactant?.molecule?.cano_smiles,
              reagent: state.reagent?.molecule?.cano_smiles,
              solvent: state.solvent?.molecule?.cano_smiles,
              num_res: 5,
              flag: false
            };
      
        ForwardActions.fetchApiResponse(params);
      };

  handleNodeSelect = (event, node) => {
        this.setState({ selectedNode: node })
      }
  
  handleMoleculeSave= () => {
        const { currentCollection, isSync } = UIStore.getState();
        console.log(currentCollection.id);
        if (currentCollection.id == 21) {
          NotificationActions.add.defer({
            message: 'Select a collection',
            level: 'error'
          });
        return;
        }
        ForwardActions.handleSave(currentCollection, this.state.selectedNode);
      };


  render() {

    const InputNode = ({ data }) => {
      // Function to handle the drag over event and allow the drop
      return (
        <div style={{
          border: '1px solid #ccc',
          padding: '10px',
          background: '#f0f0f0',
          backgroundSize: 'contain',
          maxWidth: '100%', 
          maxHeight: '100%'
        }}>
          <>
          <div style={{ 
          wordWrap: 'break-word',  // Ensure long words break to the next line
          wordBreak: 'break-all',  // Break long words if necessary
          whiteSpace: 'normal',    // Ensure text wraps within the container
          overflow: 'hidden',      // Hide any overflow
          textOverflow: 'ellipsis' // Add ellipsis for overflowing text
            }}>
          {data.label}<br />
          {data.smiles}<br />

        </div>
            <img style={{ maxWidth: '100%', maxHeight: '100%' }} src={`data:image/png;base64,${data.png}`} alt="" /><br />
            
          </>
          <div className='drop-field'>
            <DropTargetMolecule onChange={(event) => this.handleChange(event, data)}></DropTargetMolecule>
          </div>
          <Handle
            type="source"
            position={Position.Right}
            style={{ background: '#555' }}
            isConnectable={true}
          />
        </div>
      );
    };

    const SynthesisNode = ({ data }) => {
      return (
        <div style={{ justifyContent: 'center', border: '1px solid #ccc', padding: '10px', background: '#f0f0f0' }}>

          <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', flexDirection: 'column' }}>
            <img
              style={{ width: '50px' }}
              src='/images/chem.png' alt="chem"
            />
            <p style={{ justifyContent: 'center' }}><b>{data.smiles}</b></p>

          </div>
          
          <Handle
            type="target"
            position={Position.Left}
            style={{ background: '#555' }}
            isConnectable={true}
          />
          <Handle
            type="source"
            position={Position.Right}
            style={{ background: '#555' }}
            isConnectable={true}
          />
        </div>
      );
    };

    const CustomNode = ({ data }) => {
      const borderColor = data.buy ? 'green' : 'red';

      // Extract buyables data or set it as an empty array if not available
      const buyables = data.buyables || { result: [] };
      const { result, search } = buyables;

      // Prepare buyablesInfo string if there are buyables
      let buyablesInfo = '';
      if (result.length > 0) {
        buyablesInfo = result.map((item) => `Source: ${item.source}, PPG: ${item.ppg} USD`).join('\n');
      }

      return (
        <div
          style={{ border: `2px solid ${borderColor}`, padding: '10px', background: '#f0f0f0', zIndex: '0' }}
          title={
            `${data.smiles} - \nProb:${data.prob}\nRank: ${data.rank}` +
            (data.buy
              ? buyablesInfo
                ? `\nBuyable\n${buyablesInfo}`
                : '\nNot Buyable'
              : '')
          }
        >
          <div style={{ maxWidth: '100%', maxHeight: '100%' }}>
            <img style={{ maxWidth: '100%', maxHeight: '100%' }} src={`data:image/png;base64,${data.svg}`} alt="SVG" />
          </div>
          <Handle
            type="target"
            position={Position.Left}
            style={{ background: '#555' }}
            isConnectable={true}
          />
          <Handle
            type="source"
            position={Position.Right}
            style={{ background: '#555' }}
            isConnectable={true}
          />
        </div>
      );
    };

    const nodeTypes = {
      custom: CustomNode,
      input: InputNode,
      synthesis: SynthesisNode,

    };
    const edgeTypes = {

      buttonedge: ButtonEdge,
    };

    const nodes = this.state.nodes;
    const edges = this.state.edges;

    const connectionLineStyle = { stroke: '#fff' };
    const snapGrid = [10, 10];
    const defaultViewport = { x: 0, y: 0, zoom: 0.2 };

    return (
      <div>
        {this.state.loading &&
          <div style={{ height: '700px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <img style={{ height: '100px' }} src='/images/wild_card/loading-bubbles.svg' alt="Loading..." />
          </div>
        }
        {!this.state.loading && (
          <div style={{ height: '800px' }}>
          <div style={{height: '100px',
              display: 'flex',
              justifyContent: 'center',
              alignItems: 'center',
              backgroundColor: '#f5f5f5',
              fontSize: '12px', padding: '0 10px'}}>
          Perform single step forward synthesis. Drag and drop samples as reactants, reagents and solvents. Multiple samples are currently not supported.
          Outcome of the synthesis can be saved by clicking on the molecule and using Save Molecule button. Molecules are saved to currently selected collection.
        </div>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px' }}>
                <div style={{ flexGrow: 1, display: 'flex', justifyContent: 'center',padding: '10px' }}>
                    <button onClick={this.handleMoleculeSave}>Save Molecule</button>
                    <div style={{ margin: '0 10px' }}></div>
                    <button onClick={this.handleSynthesize}>Synthesize</button>
            </div>
          <Button bsStyle="info" bsSize="xsmall" className="button-right" onClick={this.clickToReset}>
              <span><i className="fa fa-eraser" /> Reset</span>
          </Button>
          
          </div> 
            <ReactFlowProvider>
              <ReactFlow
                nodes={nodes}
                edges={edges}
                nodeTypes={nodeTypes}
                edgeTypes={edgeTypes}
                connectionLineStyle={connectionLineStyle}
                snapToGrid={true}
                snapGrid={snapGrid}
                defaultViewport={defaultViewport}
                onNodeClick={this.handleNodeSelect}
                fitView
              >
                <MiniMap minZoom={0.2} />
                <Controls />
                <Background color="#aaa" gap={16} />
              </ReactFlow>
            </ReactFlowProvider>
          </div>
        )}
      </div>
    );

  }
};

ForwardContainer.propTypes = {
  // target: PropTypes.string.isRequired,
  // num_res: PropTypes.string.isRequired, 
  // eslint-disable-line react/forbid-prop-types
}


export default ForwardContainer;