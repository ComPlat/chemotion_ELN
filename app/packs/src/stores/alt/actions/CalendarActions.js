import alt from 'src/stores/alt/alt';
import { elementShowOrNew } from 'src/utilities/routesUtils';

class CalendarActions {
  navigateToElement(eventableType, eventableId) {
    const type = eventableType.toLowerCase();

    const e = { type, params: {} };
    e.params[`${type}ID`] = eventableId;

    if (type === 'element') {
      e.klassType = 'GenericEl';
    }

    elementShowOrNew(e);
  }
}

export default alt.createActions(CalendarActions);
