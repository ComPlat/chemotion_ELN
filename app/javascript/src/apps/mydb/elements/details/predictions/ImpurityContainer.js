import React, { Component } from 'react';
import { ProgressBar } from 'react-bootstrap'; // Import ProgressBar from react-bootstrap
import DropTargetMolecule from './dragNdrop';
import { Button } from 'react-bootstrap';
import ImpurityActions from 'src/stores/alt/actions/ImpurityActions';
import ImpurityStore from 'src/stores/alt/stores/ImpurityStore';

class ImpurityContainer extends Component {
  constructor(props) {
    super(props);
    this.initialState = {
      reactant: '',
      reagent: '',
      product: '',
      solvent: '',
      apiResponse: null,
      taskStatus: null,
      taskMessage: '',
      prediction : [], 
    };
    this.handleReactantChange = this.handleReactantChange.bind(this);
    this.handleReagentChange = this.handleReagentChange.bind(this);
    this.handleProductChange = this.handleProductChange.bind(this);
    this.handleSolventChange = this.handleSolventChange.bind(this);
    this.handleFetch = this.handleFetch.bind(this);


    this.state = this.initialState;
  }

    // Subscribe to store updates when component mounts
  componentDidMount() {
    this.storeListener = ImpurityStore.listen(this.handleStoreChange);
    const initialState = ImpurityStore.getState();
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
  

  clickToReset = () => {
    this.setState(this.initialState);
  };

    handleReactantChange = (event) => {
      const sampleId = event.sample_id;
      ImpurityActions.handleReactantChange(sampleId);
    };
    handleReagentChange = (event) => {
      const sampleId = event.sample_id;
      ImpurityActions.handleReagentChange(sampleId);
    };
    handleProductChange = (event) => {
      const sampleId = event.sample_id;
      ImpurityActions.handleProductChange(sampleId);
    };
    handleSolventChange = (event) => {
      const sampleId = event.sample_id;
      ImpurityActions.handleSolventChange(sampleId);
    };

    handleFetch = () => {
      const state = ImpurityStore.getState(); // Get current state
    
          // Construct request parameters
          const params = {
            reactants: state.reactant?.molecule?.cano_smiles,
            reagents: state.reagent?.molecule?.cano_smiles,
            products: state.product?.molecule?.cano_smiles,
            solvent: state.solvent?.molecule?.cano_smiles,
          };
    
      ImpurityActions.fetchApiResponse(params);
    };

 
  render() {
    const { apiResponse, taskStatus , taskMessage, prediction } = this.state;

    const columns = [
      { displayName: 'No.', keyName: 'no' },
      { displayName: 'Predicted Impuritites', keyName: 'prd_smiles' },
      { displayName: 'Possible mechanisms', keyName: 'modes_name' },
      { displayName: 'Inspector score', keyName: 'avg_insp_score' },
      { displayName: 'Similarity score', keyName: 'similarity_to_major' }


    ];

    const progressMap = {
      'Impurity prediction started.': 16,
      'Mode 1: normal prediction': 32,
      'Mode 2: over-reaction': 48,
      'Mode 3: dimerization': 64,
      'Mode 4: solvent adduct': 80,
      'Task complete!': 100
    };

    // Get progress value based on task message
    const progress = progressMap[taskMessage] || 0;


    // Define progress bar variant and label based on task status
    let variant = 'info'; // Default variant
    let label = 'In Progress'; // Default label
    if (taskStatus === 'SUCCESS') {
      variant = 'success';
      label = 'Completed';
    } 
    else if (taskStatus === 'FAILURE') {
      variant = 'danger';
      label = 'Failed';
    }
    else if (taskMessage === 'Impurity prediction started.') {
      variant = 'info';
      label = 'In Progress';
    }
    else if (taskMessage === 'Mode 1: normal prediction') {
      variant = 'info';
      label = 'Mode 1: normal prediction';
    }
    else if (taskMessage === 'Mode 2: over-reaction') {
      variant = 'info';
      label = 'Mode 2: over-reaction';
    }
    else if (taskMessage === 'Mode 3: dimerization') {
      variant = 'info';
      label = 'Mode 3: dimerization';
    }
    else if (taskMessage === 'Mode 4: solvent adduct') {
      variant = 'info';
      label = 'Mode 4: solvent adduct';
    }

    return (
      <div>
        <div style={{height: '100px',
              display: 'flex',
              justifyContent: 'center',
              alignItems: 'center',
              backgroundColor: '#f5f5f5',
              fontSize: '12px', padding: '0 10px'}}>
          Predict possible impurities that can arise from reactions. Reactants, Reagents, Solvents and Products are required for the prediction
        </div>
        <div className='impmain-container'>
        <div >
        <Button bsStyle="info" bsSize="xsmall" className="button-right" onClick={this.clickToReset}>
              <span><i className="fa fa-eraser" /> Reset</span>
          </Button>
          
        <div className='imp-container'>
          <div>
            Reactant
          <div className="drop-ff">
          {this.state.reactant ? (
            <img style={{ maxWidth: '100%', maxHeight: '100%' }} src={`data:image/png;base64,${this.state.reactant.png}`} alt=""/>
          ) : (
            <DropTargetMolecule onChange={(event) => this.handleReactantChange(event)}/>
          )}
          </div>
          </div>
          <div>
            Reagent
          <div className="drop-ff">
          {this.state.reagent ? (
            <img style={{ maxWidth: '100%', maxHeight: '100%' }} src={`data:image/png;base64,${this.state.reagent.png}`} alt=""/>
          ) : (
            <DropTargetMolecule onChange={(event) => this.handleReagentChange(event)}>
              'Reagent'
            </DropTargetMolecule>
          )}
          </div>
          </div>
          <div>
            Solvent
          <div className="drop-ff">
          {this.state.solvent ? (
            <img style={{ maxWidth: '100%', maxHeight: '100%' }} src={`data:image/png;base64,${this.state.solvent.png}`} alt=""/>
          ) : (
            <DropTargetMolecule onChange={(event) => this.handleSolventChange(event)}>
              'Solvent'
            </DropTargetMolecule>
          )}
          </div>
          </div>
          <div>
            Product
          <div className="drop-ff">
          {this.state.product ? (
            <img style={{ maxWidth: '100%', maxHeight: '100%' }} src={`data:image/png;base64,${this.state.product.png}`} alt=""/>
          ) : (
            <DropTargetMolecule onChange={(event) => this.handleProductChange(event)}>
              'Product'
            </DropTargetMolecule>
          )}
          </div>
          </div>
        </div>
        <br></br>
        <div className='imp-results'>
          <button onClick={() => this.handleFetch()} style={{ justifyContent: 'center', padding: '8px 16px', borderRadius: '4px', background: 'gray', color: '#fff', border: 'none' }}>Predict Impurities</button>
          <br></br>
          <div style={{ marginTop: '16px' }}>{apiResponse &&
          <div> 
          <ProgressBar animated now={progress} variant={variant} label={label} />
          {taskStatus === 'SUCCESS' && (
            <>
            <table>
            <thead>
              <tr>
                {columns.map((column, index) => (
                  <th key={index } style={{ padding: '10px' }}>{column.displayName}</th>
                ))}
              </tr>
            </thead>
            <tbody>
            {prediction.map((item, rowIndex) => (
                <tr key={rowIndex}>
                  {/* {columns.map((column, colIndex) => (
                    <td key={colIndex} style={{ padding: '10px' }}>{item[column.keyName]}</td>
                  ))} */}
                  <td style={{ padding: '10px' }}>{item['no']}</td>
                  {/* <td style={{ padding: '10px' }}>{item['prd_smiles']}</td> */}
                  <td style={{ padding: '10px' }}>
                    {<img src={`data:image/png;base64,${item['svg']}`} alt="SVG"/>}
                  </td>
                  <td style={{ padding: '10px' }}>{item['modes_name']}</td>
                  <td style={{ padding: '10px' }}>{item['avg_insp_score']}</td>
                  <td style={{ padding: '10px' }}>{item['similarity_to_major']}</td>
                </tr>
              ))}
            </tbody>
          </table>
          </>)
          }
          </div>
          
          }
          </div>
        </div>
      </div>
    </div>
    </div>
    );
  }
}

export default ImpurityContainer;
