import SamplesFetcher from 'src/fetchers/SamplesFetcher';
import RetroFetcher from 'src/fetchers/RetroFetcher';
import NotificationActions from 'src/stores/alt/actions/NotificationActions';
import alt from '../alt';
import MoleculesFetcher from 'src/fetchers/MoleculesFetcher';
import ElementActions from 'src/stores/alt/actions/ElementActions';
import Sample from 'src/models/Sample';
import { countReactions } from 'src/apps/mydb/elements/details/predictions/retroTree';

// Prediction failures come back either as a rejected fetch or as { error }.
const failPrediction = (dispatch, error) => {
  console.log(error);
  dispatch({ type: 'ERROR', payload: { error: error || 'Prediction failed' } });
};

const noReactionsFound = () => {
  NotificationActions.add.defer({
    message: 'No further expansion possible',
    level: 'info'
  });
};

class RetroActions {

  handleReactionReset = () =>{
    return (dispatch) =>{
      dispatch({
        type: 'REACTION_RESET',
        payload: {
        reaction : {reaction_obj : null, reactants : [], reagents : [], products : []}
        }
    });
    }
  }
  
  resetTree = () => ({ type: 'RESET_TREE' });

  // Show or hide everything below the node with this key.
  toggleFold = (key) => key;

  handleDrop = (event) => {
    return (dispatch) => {
      SamplesFetcher.fetchById(event.sample_id)
        .then((sample) => RetroFetcher.fetchprecursors({ smis: sample._molecule.cano_smiles })
          .then((response) => {
            if (!response || response.error) {
              failPrediction(dispatch, response?.error);
              return;
            }
            if (countReactions(response) === 0) noReactionsFound();
            dispatch({ type: 'GENERATE_TREE', payload: { tree: response, sample } });
          }))
        .catch((error) => failPrediction(dispatch, error));
    };
  };

  handleNodeExpand = (selectedNode) => {
    return (dispatch) => {
      if (selectedNode.type === 'custom') {
        RetroFetcher.fetchprecursors({ smis: selectedNode.data.smiles })
          .then((response) => {
            if (!response || response.error) {
              failPrediction(dispatch, response?.error);
              return;
            }
            if (countReactions(response) === 0) noReactionsFound();
            dispatch({ type: 'EXPAND_NODE', payload: { tree: response, nodeKey: selectedNode.id } });
          })
          .catch((error) => failPrediction(dispatch, error));
      } else if (selectedNode.type === 'reaction') {
        const { tforms } = selectedNode.data;
        if (tforms) {
          navigator.clipboard.writeText(tforms.join('\n'));
        }
      }
    };
  };

    handleCreateMolecule = (currentCollection,smiles) => {
        return(dispatch)=>{

          const newSample = Sample.buildEmpty(currentCollection.id);
          MoleculesFetcher.fetchBySmi(smiles)
            .then((result) => {
              if (!result || result == null) {
                NotificationActions.add({
                  title: 'Error on Sample creation',
                  message: `Cannot create molecule with entered Smiles/CAS! [${smiles}]`,
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
                loading : false
                }
            });
            })
      
        }
    }


  createSampleforReaction = (currentCollection, smiles, sample_type) => {
    return (dispatch)=>{
      return new Promise((resolve, reject) => {
        const newSample = Sample.buildEmpty(currentCollection.id);
    
        MoleculesFetcher.fetchBySmi(smiles)
          .then((result) => {
            if (!result || result === null) {
              NotificationActions.add({
                title: 'Error on Sample creation',
                message: `Cannot create molecule with entered Smiles/CAS! [${smiles}]`,
                level: 'error',
                position: 'tc'
              });
              resolve(null); // Resolve with null if no result
            } else {
              // newSample.is_new = true;
              newSample.molfile = result.molfile;
              newSample.molecule_id = result.id;
              newSample.molecule = result;
              
              console.log(newSample)

              SamplesFetcher.create(newSample)
                .then((createdSample) => {
                  dispatch({
                            type: 'CREATE_SAMPLE',
                            payload: {
                            new: createdSample,
                            sample_type : sample_type
                            }
                      });
                  NotificationActions.add({
                        title: 'Sample created for reaction',
                        message: `Sample [${smiles}] created for reaction`,
                        level: 'success'
                      });
                  
                  resolve(createdSample); // Resolve the promise with the created sample
                })
                .catch((error) => {
                  console.error("Error creating sample", error);
                  resolve(null);
                });
            }
          })
          .catch((error) => {
            console.error(`Error fetching molecule for SMILES: ${smiles}`, error);
            resolve(null);
          });
        
      });
    }
    };
    

}

export default alt.createActions(RetroActions);