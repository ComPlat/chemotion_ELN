import SamplesFetcher from 'src/fetchers/SamplesFetcher';
import RetroFetcher from 'src/fetchers/RetroFetcher';
import NotificationActions from 'src/stores/alt/actions/NotificationActions';
import alt from '../alt';
import MoleculesFetcher from 'src/fetchers/MoleculesFetcher';
import ElementActions from 'src/stores/alt/actions/ElementActions';
import Sample from 'src/models/Sample';
import { dispatch } from 'd3';

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
  
  generateTreeData = (tree, isRoot, nodePos, nodeId) => {

    const newtreeData = { nodes: [], edges: [] };

    const rootNode = {
        id: "root",
        type: "root",
        data: { smiles: tree.request.smiles[0],  svg: tree.request.svg },
        position: { x: 0, y: 0 },
        sourcePosition: "right",
        targetPosition: "left",
        // render: CustomNode,
      };

    newtreeData.nodes.push(rootNode);

    let start_x = 0;
    let start_y = 0;

    if (!isRoot) {
    start_x = nodePos.x;
    start_y = nodePos.y;  
    }
    
    const horizontalSpacing = 360;
    const verticalSpacing = 300;

    const x_pos = 500;

    let child_len = 0;
    let parent_len = 0;
    Object.entries(tree.trees).forEach(([key, value]) => {
      child_len = child_len + value.children[0].children.length;
      parent_len = parent_len + value.children.length;
    });
    

    let reaction_counter = 1;
    let precursor_counter = 1;

    let start_point = -( ((parent_len ) * 300) / 2)

    Object.entries(tree.trees).forEach(([key, value]) => {
  
      if (value.children && value.children.length > 0) {

        value.children.forEach((child, index) => {  
          const y_pos = (reaction_counter * 300 ) + start_point;
          const reactionNode = {
            id: child.id,
            type: "reaction",
            data: { id: child.id,  smiles: child.smiles, 
                    plausibility: child.plausibility, 
                    rank: child.rank, svg: child.svg, 
                    molwt: child.rms_molwt, 
                    necessary_reagent: child.necessary_reagent, 
                    tforms: child.tforms},
            position: { x: x_pos + start_x , y: y_pos + start_y},
            sourcePosition: "right",
            targetPosition: "left",
            zIndex:isRoot ? 3 : 2,
            // render: CustomNode,
          };
          newtreeData.nodes.push(reactionNode);
          reaction_counter++;

          const reactionEdge =  
            {  id: `root_${child.id}` ,
            source: isRoot ? 'root' : nodeId,
            target: child.id,
            animated: true,
            style: { stroke: '#1e1d3a' },
          }
          newtreeData.edges.push(reactionEdge);
  
          if (child.children && child.children.length > 0) {
            let start_point = -( ((child_len) * 300) / 2)
            child.children.forEach((grandchild, grandChildIndex) => {
              const y_pos_child = (precursor_counter * 300 ) + start_point;

              const precursorNode = {
                id: grandchild.id,
                type: "custom",
                data: { smiles: grandchild.smiles , svg: grandchild.svg, buy: grandchild.is_buyable, buyables: grandchild.buyables},
                position: { x: x_pos + 300 +start_x , y: y_pos_child + start_y },
                sourcePosition: "right",
                targetPosition: "left",
                zIndex:0
                // render: CustomNode,
              };
  
              newtreeData.nodes.push(precursorNode);
              precursor_counter++;

              const reactionEdge =  
              {  id: `${child.id}_${grandchild.id} ` ,
              source: child.id,
              target: grandchild.id,
              animated: true,
              style: { stroke: '#1e1d3a' },
               }
              newtreeData.edges.push(reactionEdge);
              
            });
          }
        });
      }else {
        NotificationActions.add.defer({
          message: 'No further expansion possible',
          level: 'success'
        });
      }
    });

    return newtreeData;
  };

  handleDrop = (event, tree) => {
        
        return(dispatch) => {

        SamplesFetcher.fetchById(event.sample_id).then((sample) => {
            // this.setState({ sample: sample, loading : true});
            const params = { smis : sample._molecule.cano_smiles };
            RetroFetcher.fetchprecursors(params)
            .then((response) => {
              if (response.error) {
                NotificationActions.add({
                  title: 'Prediction server error',
                  message: response.error,
                  level: 'error',
                  position: 'tc'
                });
                dispatch({
                  type: 'ERROR',
                  payload: {
                  error : response.error,
                  loading : false
                  }});
                return; 
              }
                const newTreeData = this.generateTreeData(response, true);

                dispatch({
                    type: 'GENERATE_TREE',
                    payload: {
                    tree: response,
                    loading : false,
                    newTreeData: newTreeData,
                    sample: sample
                    }
                });

            })
            .catch((error) => {
                console.log(error);
                dispatch({
                  type: 'ERROR',
                  payload: {
                  error : error,
                  loading : false
                  }
              });

            });
        });
        }
        };

    handleNodeExpand = (selectedNode) => {
        return(dispatch) =>{
        if (selectedNode.type== 'custom'){
        const params = { smis : selectedNode.data.smiles };

        RetroFetcher.fetchprecursors(params)
          .then((response) => {
            const newTreeData = this.generateTreeData(response, false,  selectedNode.position, selectedNode.id);
            dispatch({
                type: 'EXPAND_NODE',
                payload: {
                  tree: response,
                  loading : false,
                  newTreeData: newTreeData                
                }
              });

          })
          .catch((error) => {
            console.log(error);
            dispatch({
              type: 'ERROR',
              payload: {
              error : error,
              loading : false
              }
          });
          });
          }
        else if (selectedNode.type== 'reaction'){
            let tforms = selectedNode.data.tforms;
            if (tforms){
              navigator.clipboard.writeText(tforms.join('\n'));
            }
          }
        }
      };

    handleCreateMolecule = (currentCollection,smiles) => {
        return(dispatch)=>{

          const newSample = Sample.buildEmpty(currentCollection.id);
          MoleculesFetcher.fetchBySmi(smiles)
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
                });
            }
          })
          .catch((error) => {
            console.error(`Error fetching molecule for SMILES: ${smiles}`, error);
          });
        
      });
    }
    };
    

}

export default alt.createActions(RetroActions);