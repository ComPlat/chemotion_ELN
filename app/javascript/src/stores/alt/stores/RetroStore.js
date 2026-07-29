import alt from '../alt';
import RetroActions from 'src/stores/alt/actions/RetroActions';

class RetroStore {
 constructor() {
 
    this.state = {
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

     }
 
     this.bindListeners({
        handleDropElements: RetroActions.handleDrop,
        handleExpandElements: RetroActions.handleNodeExpand,
        handleSampleSave: RetroActions.handleCreateMolecule,
        handleCreateSampleForReaction: RetroActions.createSampleforReaction,
        handleReset: RetroActions.handleReactionReset
     });
     }
 
    getState() {
       return this.state;
     }

     handleReset(action) {
        this.setState({ reaction : action.payload.reaction});
    }

    handleDropElements(action) {
        if (action.payload.error) {return;}

        const updatedNodes = [...this.state.nodes, ...action.payload.newTreeData.nodes];
        const updatedEdges = [...this.state.edges, ...action.payload.newTreeData.edges];

        this.setState({ 
            tree: action.payload.tree,
            loading : false,
            nodes: updatedNodes,
            edges: updatedEdges,
            success: true,
            sample: action.payload.sample
         });
      }

    handleExpandElements(action) {
        if (action.payload.error) {
            this.setState({ 
                loading : false
            })
        }

        const updatedNodes = [...this.state.nodes, ...action.payload.newTreeData.nodes];
        const updatedEdges = [...this.state.edges, ...action.payload.newTreeData.edges];

        this.setState({ 
            tree: action.payload.tree,
            loading : false,
            nodes: updatedNodes,
            edges: updatedEdges,
            success: true
                 });
      }

    handleSampleSave(action) {
        this.setState({ newSample: action.payload.new });
       }
 
    handleCreateSampleForReaction(action) {
        console.log(action)
        this.setState((prevState) => ({
            reaction: {
                ...prevState.reaction,
                reactants: action.payload.sample_type === 'reactant' ? [...prevState.reaction.reactants, action.payload.new] : prevState.reaction.reactants,
                reagents: action.payload.sample_type === 'reagent' ? [...prevState.reaction.reagents, action.payload.new] : prevState.reaction.reagents,
                // products: sample_type === 'product' ? [...prevState.reaction.products, createdSample] : prevState.reaction.products,
            },
        }));

        console.log('storestate', this.state);
      }
 
}

export default alt.createStore(RetroStore, 'RetroStore');
