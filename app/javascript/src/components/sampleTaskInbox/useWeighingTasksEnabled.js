import { useEffect, useState } from 'react';

import UIStore from 'src/stores/alt/stores/UIStore';
import isUIComponentEnabled from 'src/utilities/UIComponentHelper';

// Returns whether the "Weighing Tasks" UI component is enabled in the backend
// configuration (config/ui_components.yml, delivered via /api/v1/ui/initialize).
//
// Subscribes to UIStore so the value reacts to the config arriving or changing
// after mount (the config load is deferred on startup).
export default function useWeighingTasksEnabled() {
  const [enabled, setEnabled] = useState(isUIComponentEnabled('weighingTasks'));

  useEffect(() => {
    const onUiStoreChange = (state) => setEnabled(isUIComponentEnabled('weighingTasks', state));
    UIStore.listen(onUiStoreChange);
    onUiStoreChange(UIStore.getState());
    return () => UIStore.unlisten(onUiStoreChange);
  }, []);

  return enabled;
}
