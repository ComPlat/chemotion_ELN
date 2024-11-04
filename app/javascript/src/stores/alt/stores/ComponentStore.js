import alt from 'src/stores/alt/alt';
import ComponentActions from 'src/stores/alt/actions/ComponentActions';

class ComponentStore {
  constructor() {
    this.state = {
      lockAmountColumn: true,
      lockAmountColumnSolids: false,
      lockedComponents: [],
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
    const { lockedComponents } = this.state;

    if (lockConc) {
      // Add the component ID to the lockedComponents array if not already present
      if (!lockedComponents.includes(componentId)) {
        this.setState({
          lockedComponents: [...lockedComponents, componentId],
        });
      }
    } else {
      // Remove the component ID from the lockedComponents array
      this.setState({
        lockedComponents: lockedComponents.filter((id) => id !== componentId),
      });
    }
  }
}

export default alt.createStore(ComponentStore, 'ComponentStore');
