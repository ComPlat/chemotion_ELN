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
      // Each drop fills one of the fixed input nodes (ids match the labels).
      const targets = {
        UPDATE_REACTANT: ['reactant', 'Reactant'],
        UPDATE_REAGENT: ['reagent', 'Reagent'],
        UPDATE_SOLVENT: ['solvent', 'Solvent'],
      };

      if (action.type === 'ERROR') {
        console.warn('Error while fetch:', action.error);
        return;
      }
      if (!targets[action.type]) return;

      const [key, nodeId] = targets[action.type];
      const { sample, png, smiles } = action.payload;
      const nodes = this.state.nodes.map((node) => (
        node.id === nodeId ? { ...node, data: { ...node.data, png, smiles } } : node
      ));
      this.setState({ [key]: sample, nodes });
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
