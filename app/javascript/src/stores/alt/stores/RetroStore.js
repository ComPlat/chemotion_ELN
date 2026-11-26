import alt from '../alt';
import RetroActions from 'src/stores/alt/actions/RetroActions';
import {
  buildRetroTree, expandMolecule, layoutRetroTree
} from 'src/apps/mydb/elements/details/predictions/retroTree';

class RetroStore {
 constructor() {
 
    this.state = {
        target: '',
        idle: true,
        sample : {},
        newSample : {},
        reaction : {reaction_obj : null, reactants : [], reagents : [], products : []},
        nodes: [],
        edges:[],
        tree :{},
        retroTree: null,
        folded: [],
        loading : false,
        success : false

     }
 
     this.bindListeners({
        handleDropElements: RetroActions.handleDrop,
        handleExpandElements: RetroActions.handleNodeExpand,
        handleSampleSave: RetroActions.handleCreateMolecule,
        handleCreateSampleForReaction: RetroActions.createSampleforReaction,
        handleReset: RetroActions.handleReactionReset,
        handleResetTree: RetroActions.resetTree,
        handleToggleFold: RetroActions.toggleFold
     });
     }
 
    getState() {
       return this.state;
     }

     handleReset(action) {
        this.setState({ reaction : action.payload.reaction});
    }

    // A dropped sample starts a new tree; expanding grafts reactions onto it.
    // Either way the boxes and lines are laid out again from the whole tree.
    handleDropElements(action) {
        if (action.payload.error) {
            this.setState({ loading: false });
            return;
        }
        this.setTree(buildRetroTree(action.payload.tree), { sample: action.payload.sample, folded: [] });
    }

    handleExpandElements(action) {
        if (action.payload.error || !this.state.retroTree) {
            this.setState({ loading: false });
            return;
        }
        const { nodeKey } = action.payload;
        // Show the new branch even if the molecule was folded before.
        this.setTree(
            expandMolecule(this.state.retroTree, nodeKey, action.payload.tree),
            { folded: this.state.folded.filter((key) => key !== nodeKey) }
        );
    }

    handleResetTree() {
        this.setState({
            retroTree: null, folded: [], tree: {}, nodes: [], edges: [], sample: {}, success: false, loading: false
        });
    }

    handleToggleFold(key) {
        if (!this.state.retroTree) return;
        const { folded } = this.state;
        this.setTree(this.state.retroTree, {
            folded: folded.includes(key) ? folded.filter((k) => k !== key) : [...folded, key]
        });
    }

    setTree(retroTree, extra = {}) {
        const folded = extra.folded || this.state.folded;
        const { nodes, edges } = layoutRetroTree(retroTree, new Set(folded));
        this.setState({
            ...extra, retroTree, nodes, edges, loading: false, success: true
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
