import StructureEditor from 'src/models/StructureEditor';
import EditorAttrs from 'src/components/structureEditor/StructureEditorSet';
import UserStore from 'src/stores/alt/stores/UserStore';
import UIStore from 'src/stores/alt/stores/UIStore';
import loadScripts from 'src/components/structureEditor/loadScripts';
import NotificationActions from 'src/stores/alt/actions/NotificationActions';
import UIFetcher from 'src/fetchers/UIFetcher';

export const notifyError = (message) => {
  NotificationActions.add({
    title: 'Structure Editor error',
    message,
    level: 'error',
    position: 'tc',
    dismissible: 'button',
    autoDismiss: 10,
  });
};

const loadEditor = (editor, scripts) => {
  if (scripts?.length > 0) {
    loadScripts({
      es: scripts,
      id: editor,
      cbError: () => notifyError(
        `The ${editor} failed to initialize! Please contact your system administrator!`
      ),
      cbLoaded: () => {},
    });
  }
};

/**
 * Asynchronously retrieves the properties of a specific editor from the UI actions.
 *
 * @async
 * @function getEditorPropertiesFromUI
 * @param {string} editorId - The unique identifier of the editor to retrieve properties for.
 * @returns {Promise<Object|null>} Resolves to the editor properties object if found, otherwise null.
 */
const getEditorPropertiesFromUI = async (editorId) => {
  const data = await UIFetcher.initialize();
  if (data && data.structureEditors.editors && data.structureEditors.editors?.[editorId]) {
    return data.structureEditors.editors?.[editorId];
  }
  return null;
};

/**
 * Retrieves and initializes a structure editor instance by its ID.
 *
 * @async
 * @param {string} editorId - The unique identifier or alias for the editor. Defaults to 'ketcher' if not provided.
 * @param {Object} [configs={}] - Optional configuration object to override default editor settings.
 * @param {Object|null} [availableEditors=null] - Optional object containing available editors and their properties.
 * @returns {Promise<StructureEditor|null>} A promise that resolves to a StructureEditor instance if found, or null otherwise.
 */
export async function getEditorById(editorId, configs = {}, availableEditors = null) {
  const editorAlias = editorId ?? 'ketcher';

  if (editorAlias) {
    let configAlias = configs;
    let available = availableEditors?.[editorAlias] || UIStore.getState().structureEditors?.editors?.[editorAlias];
    if (!available) {
      available = await getEditorPropertiesFromUI(editorAlias);
      configAlias = { editor: editorAlias };
    }
    loadEditor(editorAlias, available.extJs);
    const editorConfigs = {
      ...EditorAttrs[editorAlias],
      ...available,
      ...configAlias,
      id: editorAlias,
    };
    return new StructureEditor(editorConfigs);
  }
  return null;
}

/**
 * Asynchronously creates a map of editor instances based on matrice configurations.
 *
 * @param {Object} [_state={}] - Optional state object containing matriceConfigs.
 * @param {Array} [_state.matriceConfigs] - Array of matrice configuration objects.
 * @returns {Promise<Object>} A promise that resolves to an object mapping editor IDs to their instances.
 */
export async function createEditors(_state = {}) {
  const matriceConfigs = _state.matriceConfigs || UserStore.getState().matriceConfigs || [];
  const availableEditors = UIStore.getState().structureEditors?.editors || {};

  const editorPromises = matriceConfigs.map(({ configs }) => {
    const id = configs.editor;
    return getEditorById(id, configs, availableEditors);
  });

  const resolvedEditors = await Promise.all(editorPromises);

  const editorsMap = resolvedEditors
    .filter(Boolean)
    .reduce((acc, editorInstance) => {
      acc[editorInstance.id] = editorInstance;
      return acc;
    }, {});

  return editorsMap;
}

/**
 * Initializes and returns the structure editor instance based on the user's profile settings.
 * If the user's default structure editor is not set or is 'ketcher2', it defaults to 'ketcher'.
 *
 * @async
 * @returns {Promise<Object>} The editor instance corresponding to the selected editor ID.
 */
export const initEditor = async () => {
  const userProfile = UserStore.getState().profile;
  let eId = userProfile?.data?.default_structure_editor;
  if (!eId || eId === 'ketcher2') eId = 'ketcher';
  return getEditorById(eId);
};
