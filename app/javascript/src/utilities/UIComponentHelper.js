import UIStore from 'src/stores/alt/stores/UIStore';

// Checks whether an optional UI component is enabled.
//
// The backend delivers the ui_components configuration
// (config/ui_components.yml) via GET /api/v1/ui/initialize. Keys are camelized
// by the fetcher, so a config entry `weighing_tasks` is read here as
// `weighingTasks`.
//
// Optional components are OPT-IN and fail closed: a component is enabled only
// when its config value is explicitly `true`. Anything else leaves it disabled,
// including while the config is still loading (`uiComponents` undefined until
// `ui/initialize` resolves), so a disabled component is never briefly shown and
// then removed. This mirrors the backend behaviour in app/services/ui_components.rb.
export default function isUIComponentEnabled(name, state = UIStore.getState()) {
  return state?.uiComponents?.[name] === true;
}
