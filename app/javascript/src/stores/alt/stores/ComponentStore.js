import alt from 'src/stores/alt/alt';
import ComponentActions from 'src/stores/alt/actions/ComponentActions';

class ComponentStore {
  constructor() {
    this.state = {
      lockAmountColumn: true,
      lockAmountColumnSolids: false,
      lockedComponentID: null,
    };

    this.bindListeners({
      handleToggleLockState: ComponentActions.toggleLockState,
      handleToggleComponentLock: ComponentActions.toggleComponentLock,
    });
  }

  handleToggleLockState({ key, value }) {
    this.setState({ [key]: value });
  }

  handleToggleComponentLock({ componentId, lockConc }) {
    this.setState({
      // Lock the component if lockState is true, else unlock by setting it to null
      lockedComponentID: lockConc ? componentId : null,
    });
  }
}

export default alt.createStore(ComponentStore, 'ComponentStore');
