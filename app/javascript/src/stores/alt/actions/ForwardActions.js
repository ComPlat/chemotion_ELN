import _, { create } from 'lodash';
import alt from '../alt';
import ForwardFetcher from 'src/fetchers/ForwardFetcher';
import MoleculesFetcher from 'src/fetchers/MoleculesFetcher';
import PngFetcher from 'src/fetchers/PngFetcher';
import SamplesFetcher from 'src/fetchers/SamplesFetcher';
import ElementActions from 'src/stores/alt/actions/ElementActions';
import Sample from 'src/models/Sample';


class ForwardActions {

  fetchApiResponse = (params) => {

    return (dispatch) => {

    console.log('parkjrh',params);

    ForwardFetcher.fetchforward(params).then((response) => {
      console.log(response);
      const treeData = this.generateTreeData(response.outcomes);
      dispatch({
        type: 'FETCH_API_SUCCESS',
        payload: {
          tree: response,
          nodes: treeData.nodes,
          edges: treeData.edges,
          loading: false
        }
      });

    })
      .catch((error) => {
        console.log(error);
        dispatch({
          type: 'ERROR',
          payload: {
            error : errror,
            loading: false
          }
        });
      });
    }
  }

  generateTreeData = (outcomes) => {
    const newtreeData = { nodes: [], edges: [] };
    const x_pos = 600;
    let child_len = 0;
    let parent_len = 0;

    child_len = outcomes.length;
    let precursor_counter = 1;

    Object.entries(outcomes).forEach(([key, value]) => {

      if (outcomes && outcomes.length > 0) {
        let start_point = -(((child_len) * 300) / 2)

        const y_pos_child = (precursor_counter * 300) + start_point;

        const outcomeNode = {
          id: `custom_${value.rank}`,
          type: "custom",
          data: {
            smiles: value.smiles,
            svg: value.png,
            buy: value.is_buyable,
            buyables: value.buyables,
            rank: value.rank,
            prob: value.prob,

          },
          position: { x: x_pos, y: y_pos_child },
          sourcePosition: "right",
          targetPosition: "left",
          zIndex: 0
          // render: CustomNode,
        };
        newtreeData.nodes.push(outcomeNode);
        precursor_counter++;

        const outcomeEdge =
        {
          id: `synth_${value.rank}`,
          source: "Synthesis",
          target: `custom_${value.rank}`,
          animated: true,
          style: { stroke: '#1e1d3a' },
        }
        newtreeData.edges.push(outcomeEdge);

      }

    });
    return newtreeData;

  };
  

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
            message: `Cannot create molecule with entered Smiles/CAS! [${smi}]`,
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
          ElementActions.createSample(newSample, true);

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