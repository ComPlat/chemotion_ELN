import alt from 'src/stores/alt/alt';
import ComponentActions from 'src/stores/alt/actions/ComponentActions';

/**
 * ComponentStore manages the state for component locking in the UI.
 * Handles lock state for amount columns and individual components.
 */
class ComponentStore {
  /**
   * Initializes the store state and binds listeners to actions.
   */
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

  /**
   * Handles toggling the lock state for amount columns.
   * @param {Object} param0 - Object containing key and value to update.
   * @param {string} param0.key - The key in the state to update.
   * @param {boolean} param0.value - The new value for the key.
   */
  handleToggleLockState({ key, value }) {
    this.setState({ [key]: value });
  }

  /**
   * Handles toggling the lock state for a specific component.
   * Adds or removes the component ID from the lockedComponents array.
   * @param {Object} param0 - Object containing componentId and lockConc.
   * @param {string|number} param0.componentId - The ID of the component to lock/unlock.
   * @param {boolean} param0.lockConc - Whether the component should be locked.
   */
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
