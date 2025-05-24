import React, { Component, useState} from 'react';
import { Button } from 'react-bootstrap';
import PropTypes from 'prop-types';
import DropTargetMolecule from './dragNdrop';
import ReactFlow, { ReactFlowProvider, Controls, MiniMap, Background, Handle, Position} from 'reactflow';
import ButtonEdge from './ButtonEdge';
import ElementActions from 'src/stores/alt/actions/ElementActions';
import UIStore from 'src/stores/alt/stores/UIStore';
import Reaction from 'src/models/Reaction';
import NotificationActions from 'src/stores/alt/actions/NotificationActions';
import RetroActions from '../../../../../stores/alt/actions/RetroActions';
import RetroStore from 'src/stores/alt/stores/RetroStore';


class RetroContainer extends Component {
  constructor(props) {
    super(props);
    this.initialState = {
      target: '',
      idle: true,
      sample : {},
      newSample : {},
      reaction : {reaction_obj : null, reactants : [], reagents : [], products : []},
      selectedNode : {},
      nodes: [],
      edges:[],
      tree :{},
      showSVG: false, 
      hoveredNode: null,
      loading : false,
      treeData : { nodes: [], edges: [] },
      success : false
    };

    this.handleChange = this.handleChange.bind(this);
    this.handleMouseEnter = this.handleMouseEnter.bind(this);
    this.handleMouseLeave = this.handleMouseLeave.bind(this);
    this.state = this.initialState;

  }

  clickToReset = () => {
    this.setState(this.initialState);
  };

  componentDidMount() {
        this.storeListener = RetroStore.listen(this.handleStoreChange);
        const initialState = RetroStore.getState();
        this.setState(initialState);  
        }
    
      // Unsubscribe from store updates when the component unmounts
  componentWillUnmount() {
        if (this.storeListener) {
          this.storeListener();  // Unsubscribe the listener
        }
      }
    
  handleStoreChange = (newState) => {
        // Update the component's state with the new store state
          this.setState(newState);
        };

  resolveOverlap(nodes) {
    const usedPositions = new Set();

    return nodes.map(node => {
      let iterations = 0;  // Initialize a counter for bailout
  
      // Check if the position is already used
      while (usedPositions.has(`${node.position.x},${node.position.y}`)) {
        node = {
          ...node,
          position: {
            x: node.position.x + 200, // Update x position
            y: node.position.y + 200, // Update y position
          },
        };
        console.log('previous', node);
        iterations += 1;  // Increment the counter
  
        // Bailout condition to prevent infinite loops
        if (iterations > 10) {
          console.warn("Bailout: Unable to resolve overlap after 10 iterations");
          break;
        }
      }
  
      usedPositions.add(`${node.position.x},${node.position.y}`);
  
      return node;
    });
  }

  handleMoleculeSave = () =>{
    const { currentCollection } = UIStore.getState();
    if (currentCollection.id == 21) {
      NotificationActions.add.defer({
        message: 'Select a collection',
        level: 'error'
      });
    return;
    }
    RetroActions.handleCreateMolecule( currentCollection, this.state.selectedNode.data.smiles);
  }

handleReactionSave = () => {
  const { currentCollection } = UIStore.getState();
  const selectedNode = this.state.selectedNode;

  if (selectedNode.type != 'reaction'){
    NotificationActions.add.defer({
      message: 'Select a Reaction Node',
      level: 'error'
  });
  return;
  }

  if (currentCollection.id == 21) {
    NotificationActions.add.defer({
        message: 'Select a collection',
        level: 'error'
    });
    return;
  }


  RetroActions.handleReactionReset();

  const reactionSmiles = selectedNode.data.smiles;
  console.log("Reaction SMILES:", reactionSmiles);

  const parts = reactionSmiles.split(">>");

  const reactants = parts[0] || ""; // Reactants should always be present
  const reagents = selectedNode.data.necessary_reagent || null;

  const fetchSamples = (smilesString, sample_type) => {
    if (!smilesString) return Promise.resolve([]);

    const smilesArray = smilesString.split("."); 

    return Promise.all(smilesArray.map(smiles => {
      return RetroActions.createSampleforReaction(currentCollection, smiles, sample_type)
        .then(result => result)
        .catch(error => {
          console.error(`Error fetching sample for SMILES: ${smiles}`, error);
          return null; // Handle error gracefully
        });
    }));
  };

  const fetchReactantSamples = fetchSamples(reactants, 'reactant');

  let fetchReagentSamples = Promise.resolve([]); // Default to resolved empty promise
  if (reagents) {
    fetchReagentSamples = fetchSamples(reagents, 'reagent');
  }
  
  Promise.all([fetchReactantSamples, fetchReagentSamples]).then(() => {
    const newReaction = Reaction.buildEmpty(currentCollection.id);
    console.log(newReaction);
    newReaction.starting_materials = [...this.state.reaction.reactants];
    newReaction.products = [...this.state.sample];
    newReaction.reagents = [...this.state.reaction.reagents];

    ElementActions.createReaction(newReaction);
   
    });
};

  handleNodeSelect = (event, node) =>{

    this.setState({selectedNode : node})
  }

  // handleNodeSelect = (event, node) => {
  //   this.setState((prevState) => ({
  //       selectedNode: node, // Store the selected node separately
  //       treeData: {
  //           ...prevState.treeData,
  //           nodes: prevState.treeData.nodes.map(n => ({
  //               ...n,
  //               selected: n.id === node.id // Mark only the clicked node as selected
  //           }))
  //       }
  //   }));
  // };

  handleCopyTemplate = (event) => {

    if (navigator.clipboard) {
      let tforms = this.state.selectedNode.data.tforms;
      if (tforms){
          navigator.clipboard.writeText(tforms.join('\n')).then(() => {
          console.log('Node data copied to clipboard');
        })
        .catch((err) => {
          console.error('Failed to copy: ', err);
        });
    } else {
      console.error('Clipboard API not supported');
    }
  }
  }


  handleChange = (event)=>{
    this.setState({ loading : true });
    RetroActions.handleDrop(event, this.state.tree);
  }

  handleNodeExpand = () =>{
    if (selectedNode.type != 'custom'){
      NotificationActions.add.defer({
        message: 'Select a Molecule Node',
        level: 'error'
    });
    return;
    }

    this.setState({ loading : true });

    RetroActions.handleNodeExpand(this.state.selectedNode);
  }

  handleMouseEnter(event, node) {
    // Update state to show the SVG on hover
    this.setState({ showSVG: true, hoveredNode: node });
  }

  handleMouseLeave(event, node) {
    // Update state to hide the SVG when the mouse leaves the node
    this.setState({ showSVG: false, hoveredNode: null });
  }
  
  render() {

    const { showSVG, hoveredNode } = this.state; 
    const RootNode = ( { data } ) => {
      return (
        <div style={{ border: '1px solid #ccc', padding: '10px', background: '#f0f0f0' }}>
  
        
          <div style={{ maxWidth: '100%', maxHeight: '100%' }}>
            <img
              style={{ maxWidth: '100%', maxHeight: '100%' }}
              src={`data:image/png;base64,${data.svg}`} alt="SVG"
            />
           <p style={ {justifyContent: 'center'} }><b>{ data.smiles }</b></p>         
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

    const buyables = data.buyables || { result: [] };
    const { result, search } = buyables;

    let buyablesInfo = '';
    if (result.length > 0) {
      buyablesInfo = result.map((item) => `Source: ${item.source}, PPG: ${item.ppg} USD`).join('\n');
    }

    return (
      <div
        style={{ border: `2px solid ${borderColor}`, padding: '10px', background: '#f0f0f0', zIndex: '0' }}
        title={data.buy ? (buyablesInfo ? `${data.smiles} - \nBuyable\n${buyablesInfo}` : `${data.smiles} - Not Buyable`) : data.smiles}
      >
        
        <div style={{ maxWidth: '100%', maxHeight: '100%' }}>
          <img style={{ maxWidth: '100%', maxHeight: '100%' }} src={`data:image/png;base64,${data.svg}`} alt="SVG" />
        </div>
        {/* <button className='expbutton' style={{ marginTop: '10px', alignSelf: 'center'}} onClick={() => this.handleSave(data.smiles)} >Save Molecule</button> */}
        <Handle
          type="target"
          position={Position.Left}
          style={{ background: '#555' }}
          // onConnect={(params) => console.log('handle onConnect', params)}
          isConnectable={true}
        />
        <Handle
          type="source"
          position={Position.Right}
          style={{ background: '#555' }}
          // onConnect={(params) => console.log('handle onConnect', params)}
          isConnectable={true}
        />
      </div>
  
      )

  };

    const ReactionNode = ({ data }) => {
      return (
        <div>
          <div style={{ display: 'flex', alignItems: 'center' }}>
            <div
              style={{
                width: '100px',
                height: '100px',
                borderRadius: '50%',
                backgroundColor: 'gray',
                position: 'relative',
                cursor: 'pointer',
                // zIndex: 2,
              }}
              onMouseEnter={(event) => this.handleMouseEnter(event, data)} // Call the new event handlers
              onMouseLeave={this.handleMouseLeave} // Call the new event handlers
            >
              <div
                style={{
                  display: showSVG ? 'none' : 'block',
                  position: 'absolute',
                  top: '50%',
                  left: '50%',
                  transform: 'translate(-50%, -50%)',
                  textAlign: 'center',
                  color: 'white',
                  fontWeight: 'bold',
                  fontSize: '20px',
                  lineHeight: '50px',
                  zIndex: '2',
                }}
              >
                Rank:{data.rank}
              </div>
            </div>
          </div>

          {showSVG && hoveredNode.id === data.id && (
                  <div
                    style={{
                      position: 'absolute',
                      top: '-120px',
                      left: '60px',
                      width: '700px',
                      height: '200px',
                      backgroundColor: 'white',
                      border: '1px solid gray',
                      borderRadius: '5px',
                      display: 'flex',
                      justifyContent: 'center',
                      alignItems: 'center',
                    }}
                  >
                    <div style={{ justifyContent: 'center', padding: '10px' }}>
                      <div style={{ textAlign: 'center' }}>
                        <img src={`data:image/png;base64,${data.svg}`} width="600px" alt="Reaction SVG" />
                        <p style={{ fontSize: 'larger' }}>Reaction Plausibility: {data.plausibility}</p>
                        {data.necessary_reagent && (
                          <p style={{ fontSize: 'larger' }}>Necessary Reagent: {data.necessary_reagent}</p>
                        )}
                      </div>
                    </div>
                  </div>
                )}

    
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
      reaction: ReactionNode,
      root: RootNode,
    };
    const edgeTypes = {

      buttonedge: ButtonEdge,
    };

    const nodes = this.state.nodes;
    const edges = this.state.edges;

    const connectionLineStyle = { stroke: '#fff' };
    const snapGrid = [10,10 ];
    const defaultViewport = { x: 0, y: 0, zoom: 0.5 };

    return (
      <div> 
        {this.state.loading && 
          <div style={{ height: '700px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <img style={{ height: '100px' }} src='/images/wild_card/loading-bubbles.svg' alt="Loading..." />
          </div>
        }
        {!this.state.loading && (
        <div>
        <div style={{height: '100px',
              display: 'flex',
              justifyContent: 'center',
              alignItems: 'center',
              backgroundColor: '#f5f5f5',
              fontSize: '12px', padding: '0 10px'}}>
          Perform single step retro synthesis. Drag and drop sample in the drop field.
          Outcome of the synthesis can be saved by clicking on the molecule and using Save Molecule button. Reaction can be saved by clicking on the reacton node and clicking save reaction button.
          Clicking on the molecule are pressing Expand molecule, expands the tree node to find precurors of that molecule.
          By clicking on Reaction node and pressing Copy reaction template, copies reaction template ID. 
          Molecules are saved to currently selected collection.
        </div>
        <div className="dropzone" >
          <DropTargetMolecule onChange={this.handleChange}/>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px' }}>
                <div style={{ flexGrow: 1, display: 'flex', justifyContent: 'center' }}>
                <button onClick={this.handleMoleculeSave} title="Save the current molecule to the current collection"  disabled={!this.state.success}>Save Molecule</button>
                <div style={{ margin: '0 10px' }}></div>
                <button onClick={this.handleReactionSave} title="Save the reaction to the current collection">Save Reaction</button>
                <div style={{ margin: '0 10px' }}></div>
                <button onClick={this.handleNodeExpand} title="Find precusors for selected molecule">Expand Molecule</button>
                <div style={{ margin: '0 10px' }}></div>
               {/* <button onClick={this.handleCopyTemplate} title="Copy reaction template id for lookup">Copy reaction template</button> */}
            </div>
          <Button bsStyle="info" bsSize="xsmall" className="button-right" onClick={this.clickToReset}>
              <span><i className="fa fa-eraser" /> Reset</span>
          </Button>
        </div>
        <div style={{ height: '700px' }}>
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
        <MiniMap  minZoom={0.3} />
        <Controls />
        <Background color="#aaa" gap={16} />
        </ReactFlow>
        </ReactFlowProvider>
        </div>
        </div>
        )
        }
      </div>
    );

  }
};

RetroContainer.propTypes = {
  num_res: PropTypes.string.isRequired,
  sample: PropTypes.object
}


export default RetroContainer;