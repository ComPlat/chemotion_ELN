import alt from '../alt';
import ImpurityActions from 'src/stores/alt/actions/ImpurityActions';

class ImpurityStore {
  constructor() {

    this.state = {
      reactant : '',
      reagent : '',
      product : '',
      solvent : '',
      apiResponse: null,
      taskStatus: null,
      taskMessage: '',
      prediction : [], 
      error: null
    }

    this.bindListeners({

        handleUpdateReactant: ImpurityActions.handleReactantChange,
        handleUpdateReagent: ImpurityActions.handleReagentChange,
        handleUpdateProduct: ImpurityActions.handleProductChange,
        handleUpdateSolvent: ImpurityActions.handleSolventChange,
        handleFetchApiResponse: ImpurityActions.fetchApiResponse,
        handlePollTaskStatus: ImpurityActions.pollTaskStatus

    });
    }

    getState() {
      return this.state;
    }

    handleUpdateReactant(value) {
        this.setState({ reactant: value.payload });
      }
    
    handleUpdateReagent(value) {
        this.setState({ reagent: value.payload });
    
      }
    handleUpdateProduct(value) {
        this.setState({ product: value.payload });
    
      }
    handleUpdateSolvent(value) {
        this.setState({ solvent: value.payload });
      }

    handleFetch(value) {
        this.setState({ solvent: value.payload });
      }

    handleFetchApiResponse(response) {
        if (response.error) {
          this.setState({ error: response.error, taskStatus: 'FAILURE' });
        } else {
          this.setState({ apiResponse: response, taskStatus: 'PENDING' });
        }
      }
    
    handlePollTaskStatus(response) {
        if (response.error) {
          this.setState({ error: response.error, taskStatus: 'FAILURE' });
        } else {
          this.setState({
            taskStatus: response.state,
            taskMessage: response.message,
          });
    
          if (response.state === 'SUCCESS' || response.state === 'FAILURE') {
            this.setState({ prediction: response.output.predict_expand });
            console.log(this.state);
          }
        }
      }
}

export default alt.createStore(ImpurityStore, 'ImpurityStore');
