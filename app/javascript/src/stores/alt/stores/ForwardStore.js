import alt from '../alt';
import ForwardActions from 'src/stores/alt/actions/ForwardActions';

class ForwardStore {
 constructor() {
     this.state = {
       reactant : '',
       reagent : '',
       product : '',
       solvent : '',
       sample: {},
       newSample : {},
       loading : false,
       nodes: [{
        id: 'Reactant',
        type: 'input',
        data: { label: 'Reactant' },
        width: 100,
        height: 200,
        position: { x: 0, y: 0 },
      },
      {
        id: 'Reagent',
        type: 'input',
        data: { label: 'Reagent' },
        position: { x: 0, y: 250 },
      }, {
        id: 'Solvent',
        type: 'input',
        data: { label: 'Solvent' },
        position: { x: 0, y: 500 },
      }, {
        id: 'Synthesis',
        type: 'synthesis',
        data: { label: 'synthesis' },
        position: { x: 300, y: 250 },
      }

      ],
      edges: [
        {
          id: 're-sy',
          source: 'Reactant',
          target: 'Synthesis',
          animated: true,
        },
        {
          id: 'reag-sy',
          source: 'Reagent',
          target: 'Synthesis',
          animated: true,
        },
        {
          id: 'sol-sy',
          source: 'Solvent',
          target: 'Synthesis',
          animated: true,
        }

      ]
     }
 
     this.bindListeners({
         handleUpdateElements: ForwardActions.handleChange,
         handleFetchApiResponse: ForwardActions.fetchApiResponse,
         handleMoleculeSave: ForwardActions.handleSave
     });
     }
 
     getState() {
       return this.state;
     }
 
    handleUpdateElements(action) {
      switch (action.type) {
        case 'UPDATE_REACTANT':

          this.setState({ reactant: action.payload.sample });
          const reactionNode = this.state.nodes[0];
          reactionNode.data = { ...reactionNode.data, png: action.payload.png, smiles: action.payload.smiles };
          const updatereactionNode = [...this.state.nodes, ...reactionNode];
          this.setState({ nodes: updatereactionNode });

          break;
    
        case 'UPDATE_REAGENT':

          this.setState({ reagent: action.payload.sample });
          const reagentNode = this.state.nodes[1];
          reagentNode.data = { ...reagentNode.data, png: action.payload.png, smiles: action.payload.smiles };
          const updatereagentNode = [...this.state.nodes, ...reagentNode];
          this.setState({ nodes: updatereagentNode });
          break;
    
        case 'UPDATE_SOLVENT':

          this.setState({ solvent: action.payload.sample });
          const solventNode = this.state.nodes[2];
          solventNode.data = { ...solventNode.data, png: action.payload.png, smiles: action.payload.smiles };
          const updatesolventNode = [...this.state.nodes, ...solventNode];
          this.setState({ nodes: updatesolventNode });

          break;
    
        case 'ERROR':
          console.warn('Error while fetch:', action.error);
      }
    }

    handleFetch(value) {
         this.setState({ solvent: value.payload });
       }
 
    handleFetchApiResponse(action) {
         if (action.error) {
           this.setState({ error: action.error});
         } else {

          const updatedNodes = [...this.state.nodes, ...action.payload.nodes];
          const updatedEdges = [...this.state.edges, ...action.payload.edges];

           this.setState({ tree: action.payload.tree,
            nodes: updatedNodes,
            edges: updatedEdges,
            loading: false });
         }
       }

    handleMoleculeSave(action) {
        this.setState({ newSample: action.payload.new });
       }

 
}

export default alt.createStore(ForwardStore, 'ForwardStore');
