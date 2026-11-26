import _, { create } from 'lodash';
import alt from '../alt';
import PngFetcher from 'src/fetchers/PngFetcher';
import SamplesFetcher from 'src/fetchers/SamplesFetcher';
import ImpurityFetcher from 'src/fetchers/ImpurityFetcher';
import CeleryTaskFetcher from 'src/fetchers/CeleryTaskFetcher';


class ImpurityActions { 

    handleReactantChange(sampleId) {
        return (dispatch) => {
          SamplesFetcher.fetchById(sampleId)
            .then((sample) => {
              const params = { smiles: sample._molecule.cano_smiles };
    
              return PngFetcher.fetchpng(params).then((pngfile) => {
                sample['png'] = pngfile;
    
                dispatch({
                  type: 'UPDATE_REACTANT',
                  payload: sample
                });
              });
            })
            .catch((error) => {
              dispatch({
                type: 'UPDATE_REACTANT_ERROR',
                error: error.message || 'Error fetching reactant data'
              });
            });
        };
      }

    handleReagentChange(sampleId) {
        return (dispatch) => {
          SamplesFetcher.fetchById(sampleId)
            .then((sample) => {
              const params = { smiles: sample._molecule.cano_smiles };
    
              return PngFetcher.fetchpng(params).then((pngfile) => {
                sample['png'] = pngfile;
    
                dispatch({
                  type: 'UPDATE_REAGENT',
                  payload: sample
                });
              });
            })
            .catch((error) => {
              dispatch({
                type: 'UPDATE_REAGENT_ERROR',
                error: error.message || 'Error fetching reagent data'
              });
            });
        };
      }

    handleProductChange(sampleId) {
        return (dispatch) => {
          SamplesFetcher.fetchById(sampleId)
            .then((sample) => {
              const params = { smiles: sample._molecule.cano_smiles };
    
              return PngFetcher.fetchpng(params).then((pngfile) => {
                sample['png'] = pngfile;
    
                dispatch({
                  type: 'UPDATE_PRODUCT',
                  payload: sample
                });
              });
            })
            .catch((error) => {
              dispatch({
                type: 'UPDATE_PRODUCT_ERROR',
                error: error.message || 'Error fetching product data'
              });
            });
        };
      }

    handleSolventChange(sampleId) {
        return (dispatch) => {
          SamplesFetcher.fetchById(sampleId)
            .then((sample) => {
              const params = { smiles: sample._molecule.cano_smiles };
    
              return PngFetcher.fetchpng(params).then((pngfile) => {
                sample['png'] = pngfile;
    
                dispatch({
                  type: 'UPDATE_SOLVENT',
                  payload: sample
                });
              });
            })
            .catch((error) => {
              dispatch({
                type: 'UPDATE_SOLVENT_ERROR',
                error: error.message || 'Error fetching solvent data'
              });
            });
        };
      }

    pollTaskStatus(taskId) {
        return (dispatch) => {
          const params = { task_id: taskId };
    
          const interval = setInterval(() => {
            CeleryTaskFetcher.fetchtask(params)
              .then((response) => {
                dispatch(response); // Update status in store
    
                if (response.state === 'SUCCESS' || response.state === 'FAILURE') {
                  dispatch(response); 
                  clearInterval(interval);
                }
              })
              .catch((error) => {
                console.error('Error fetching task status:', error);
                dispatch({ error: error.message });
                clearInterval(interval);
              });
          }, 1000);
        };

      }

    fetchApiResponse(params) {
        return (dispatch) => {
    
          ImpurityFetcher.fetchimpurity(params)
            .then((response) => {
              dispatch(response); // Dispatch response to store
              this.pollTaskStatus(response.task_id); // Start polling
            })
            .catch((error) => {
              console.error('Error fetching API response:', error);
              dispatch({ error: error.message });
            });
        };
      }
  
}

export default alt.createActions(ImpurityActions);