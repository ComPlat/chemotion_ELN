import alt from 'src/stores/alt/alt';
import ComponentActions from 'src/stores/alt/actions/ComponentActions';

class ComponentStore {
  constructor() {
    this.state = {
      lockAmountColumn: true,
      lockAmountColumnSolids: false,
      lockConcentration: false,
      lockConcentrationSolids: false,
    };

    this.bindListeners({
      handleToggleLockState: ComponentActions.toggleLockState,
    });
  }

  handleToggleLockState({ key, value }) {
    this.setState({ [key]: value });
  }
}

export default alt.createStore(ComponentStore, 'ComponentStore');
