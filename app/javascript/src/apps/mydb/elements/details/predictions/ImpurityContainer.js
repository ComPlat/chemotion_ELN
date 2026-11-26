import React, { Component } from 'react';
import { Button, ProgressBar, Table } from 'react-bootstrap';
import DropTargetMolecule from './dragNdrop';
import { PredictionHelp, PredictionToolbar } from './PredictionUI';
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
        <PredictionHelp>
          Predict possible impurities that can arise from reactions. Reactants, reagents, solvents and products are
          all required for the prediction.
        </PredictionHelp>
        <PredictionToolbar>
          <Button variant="primary" size="sm" onClick={() => this.handleFetch()}>
            <i className="fa fa-search me-1" aria-hidden="true" />
            Predict Impurities
          </Button>
          <Button variant="outline-secondary" size="sm" className="ms-auto" onClick={this.clickToReset}>
            <i className="fa fa-eraser me-1" aria-hidden="true" />
            Reset
          </Button>
        </PredictionToolbar>
        <div className='impmain-container'>
        <div >
        <div className='imp-container'>
          <div>
            <div className="prediction-drop-label">Reactant</div>
          <div className="drop-ff">
          {this.state.reactant ? (
            <img className="prediction-thumb" src={`data:image/png;base64,${this.state.reactant.png}`} alt=""/>
          ) : (
            <DropTargetMolecule onChange={(event) => this.handleReactantChange(event)}/>
          )}
          </div>
          </div>
          <div>
            <div className="prediction-drop-label">Reagent</div>
          <div className="drop-ff">
          {this.state.reagent ? (
            <img className="prediction-thumb" src={`data:image/png;base64,${this.state.reagent.png}`} alt=""/>
          ) : (
            <DropTargetMolecule onChange={(event) => this.handleReagentChange(event)}>
              'Reagent'
            </DropTargetMolecule>
          )}
          </div>
          </div>
          <div>
            <div className="prediction-drop-label">Solvent</div>
          <div className="drop-ff">
          {this.state.solvent ? (
            <img className="prediction-thumb" src={`data:image/png;base64,${this.state.solvent.png}`} alt=""/>
          ) : (
            <DropTargetMolecule onChange={(event) => this.handleSolventChange(event)}>
              'Solvent'
            </DropTargetMolecule>
          )}
          </div>
          </div>
          <div>
            <div className="prediction-drop-label">Product</div>
          <div className="drop-ff">
          {this.state.product ? (
            <img className="prediction-thumb" src={`data:image/png;base64,${this.state.product.png}`} alt=""/>
          ) : (
            <DropTargetMolecule onChange={(event) => this.handleProductChange(event)}>
              'Product'
            </DropTargetMolecule>
          )}
          </div>
          </div>
        </div>
        <div className='imp-results'>
          <div className="mt-3">{apiResponse &&
          <div> 
          <ProgressBar animated now={progress} variant={variant} label={label} />
          {taskStatus === 'SUCCESS' && (
            <>
            <Table striped hover responsive size="sm" className="mt-3 align-middle">
            <thead>
              <tr>
                {columns.map((column, index) => (
                  <th key={index }>{column.displayName}</th>
                ))}
              </tr>
            </thead>
            <tbody>
            {prediction.map((item, rowIndex) => (
                <tr key={rowIndex}>
                  <td>{item['no']}</td>
                  <td>
                    {<img className="prediction-thumb" src={`data:image/png;base64,${item['svg']}`} alt=""/>}
                  </td>
                  <td>{item['modes_name']}</td>
                  <td>{item['avg_insp_score']}</td>
                  <td>{item['similarity_to_major']}</td>
                </tr>
              ))}
            </tbody>
          </Table>
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
