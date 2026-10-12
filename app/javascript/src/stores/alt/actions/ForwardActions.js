import alt from '../alt';
import ForwardFetcher from 'src/fetchers/ForwardFetcher';
import MoleculesFetcher from 'src/fetchers/MoleculesFetcher';
import PngFetcher from 'src/fetchers/PngFetcher';
import SamplesFetcher from 'src/fetchers/SamplesFetcher';
import NotificationActions from 'src/stores/alt/actions/NotificationActions';
import ElementActions from 'src/stores/alt/actions/ElementActions';
import Sample from 'src/models/Sample';


class ForwardActions {

  fetchApiResponse = (params) => {
    return (dispatch) => {
      // ForwardFetcher already reports server errors; it resolves to undefined
      // when the request itself fails.
      ForwardFetcher.fetchforward(params)
        .then((response) => {
          if (!response || response.error) {
            dispatch({ type: 'ERROR', payload: { error: response?.error || 'Prediction failed' } });
            return;
          }
          dispatch({ type: 'FETCH_API_SUCCESS', payload: { tree: response } });
        })
        .catch((error) => {
          console.log(error);
          dispatch({ type: 'ERROR', payload: { error: error || 'Prediction failed' } });
        });
    };
  };

  resetForward = () => ({ type: 'RESET' });

  // Reveal the next page of already fetched products.
  showMoreOutcomes = () => ({ type: 'SHOW_MORE' });

  handleChange = (sample_id, data) => {
      return (dispatch) => {
                SamplesFetcher.fetchById(sample_id)
                  .then((sample) => {
                    const params = { smiles: sample._molecule.cano_smiles };
          
                    return PngFetcher.fetchpng(params).then((pngfile) => {
                      sample['png'] = pngfile;
                      if (data.label == 'Reactant') {
                      dispatch({
                        type: 'UPDATE_REACTANT',
                        payload: {
                          sample: sample,
                          png: pngfile,
                          smiles: sample._molecule.cano_smiles
                        }
                      });
                    }
                    if (data.label == 'Reagent') {
                      dispatch({
                        type: 'UPDATE_REAGENT',
                        payload: {
                          sample: sample,
                          png: pngfile,
                          smiles: sample._molecule.cano_smiles
                        }
                      });
                    }
                    if (data.label == 'Solvent') {
                      dispatch({
                        type: 'UPDATE_SOLVENT',
                        payload: {
                          sample: sample,
                          png: pngfile,
                          smiles: sample._molecule.cano_smiles
                        }
                      });
                    }
                    });
                  })
                  .catch((error) => {
                    dispatch({
                      type: 'ERROR',
                      error: error.message || 'Error fetching reactant data'
                    });
                  });
              };

  }

  handleNodeSelect = (event, node) => {
    this.setState({ selectedNode: node })
  }

  handleSave = (currentCollection, selectedNode) => {
    return (dispatch) => {

    const newSample = Sample.buildEmpty(currentCollection.id);

    MoleculesFetcher.fetchBySmi(selectedNode.data.smiles)
      .then((result) => {
        if (!result || result == null) {
          NotificationActions.add({
            title: 'Error on Sample creation',
            message: `Cannot create molecule with entered Smiles/CAS! [${selectedNode.data.smiles}]`,
            level: 'error',
            position: 'tc'
          });
        } else {
          newSample.is_new = true;
          newSample.molfile = result.molfile;
          newSample.molecule_id = result.id;
          newSample.molecule = result;
          dispatch({
            type: 'SAVE_NEW_SAMPLE',
            payload: {
              new: newSample
            }
          });
          SamplesFetcher.create(newSample)
            .then((created) => {
              NotificationActions.add({
                message: `Sample ${created.short_label} saved to "${currentCollection.label}"`,
                level: 'success'
              });
              ElementActions.refreshElements('sample');
            })
            .catch((error) => {
              console.error('Error saving sample', error);
              NotificationActions.add({ message: 'Saving the sample failed', level: 'error' });
            });

        }
      }).catch((error) => {
        console.log(error);
        dispatch({
          type: 'ERROR',
          payload: {
            error : error,
            loading: false
          }
        });
      })

  }
}
}



export default alt.createActions(ForwardActions);