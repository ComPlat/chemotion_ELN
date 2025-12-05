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
      // Store lock states per sample ID: { sampleId: { lockAmountColumn: bool, lockAmountColumnSolids: bool } }
      lockAmountColumnBySample: {},
      lockAmountColumnSolidsBySample: {},
      lockedComponents: [],
      lockReactionEquivColumnByReaction: {}, // Lock state for reaction equivalent column per reaction ID
    };

    this.bindListeners({
      handleToggleLockState: ComponentActions.toggleLockState,
      handleToggleComponentLock: ComponentActions.toggleComponentLock,
      handleToggleReactionEquivLock: ComponentActions.toggleReactionEquivLock,
    });
  }

  /**
   * Handles toggling the lock state for amount columns per sample.
   * @param {Object} param0 - Object containing key, value, and sampleId to update.
   * @param {string} param0.key - The key in the state to update ('lockAmountColumn' or 'lockAmountColumnSolids').
   * @param {boolean} param0.value - The new value for the key.
   * @param {string|number} param0.sampleId - The ID of the sample to update.
   */
  handleToggleLockState({ key, value, sampleId }) {
    if (!sampleId) {
      console.warn('toggleLockState: sampleId is required');
      return;
    }

    const stateKey = key === 'lockAmountColumn' ? 'lockAmountColumnBySample' : 'lockAmountColumnSolidsBySample';
    const currentState = this.state[stateKey] || {};

    this.setState({
      [stateKey]: {
        ...currentState,
        [sampleId]: value,
      },
    });
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

  /**
   * Handles toggling the lock state for the reaction equivalent column.
   * @param {Object} param0 - Object containing lockState and reactionId.
   * @param {boolean} param0.lockState - The new lock state (true/false).
   * @param {string|number} param0.reactionId - The ID of the reaction to update.
   */
  handleToggleReactionEquivLock({ lockState, reactionId }) {
    if (!reactionId) {
      console.warn('toggleReactionEquivLock: reactionId is required');
      return;
    }

    const currentState = this.state.lockReactionEquivColumnByReaction || {};

    this.setState({
      lockReactionEquivColumnByReaction: {
        ...currentState,
        [reactionId]: lockState,
      },
    });
  }
}

const store = alt.createStore(ComponentStore, 'ComponentStore');

/**
 * Helper function to get lock state for a specific sample.
 * This can be called with the state object returned by ComponentStore.getState().
 * @param {Object} state - The state object from ComponentStore.getState().
 * @param {string} key - The key to get ('lockAmountColumn' or 'lockAmountColumnSolids').
 * @param {string|number} sampleId - The ID of the sample.
 * @returns {boolean} The lock state for the sample, or default value if not set.
 */
const getLockStateForSample = (state, key, sampleId) => {
  if (!sampleId) {
    // Return default values if no sampleId provided (backward compatibility)
    return key === 'lockAmountColumn';
  }

  const stateKey = key === 'lockAmountColumn' ? 'lockAmountColumnBySample' : 'lockAmountColumnSolidsBySample';
  const sampleStates = state[stateKey] || {};
  const value = sampleStates[sampleId];

  // Return default values if not set for this sample
  if (value === undefined) {
    return key === 'lockAmountColumn';
  }

  return value;
};

/**
 * Helper function to get lock state for a specific reaction.
 * This can be called with the state object returned by ComponentStore.getState().
 * @param {Object} state - The state object from ComponentStore.getState().
 * @param {string|number} reactionId - The ID of the reaction.
 * @returns {boolean} The lock state for the reaction, or false if not set.
 */
const getLockStateForReaction = (state, reactionId) => {
  if (!reactionId) {
    // Return default value if no reactionId provided
    return false;
  }

  const value = state.lockReactionEquivColumnByReaction[reactionId];

  return value ?? false;
};

// Attach the helper functions to the store instance
store.getLockStateForSample = getLockStateForSample;
store.getLockStateForReaction = getLockStateForReaction;

export default store;
