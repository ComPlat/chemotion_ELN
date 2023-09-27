import Vessel from 'src/models/Vessel';
import { extractApiParameter } from '../utilities/VesselUtils';
import BaseFetcher from 'src/fetchers/BaseFetcher';
import NotificationActions from 'src/stores/alt/actions/NotificationActions';

const successfullyCreatedParameter = {
  title: 'Element created',
  message: 'Vessel successfully added',
  level: 'info',
  dismissible: 'button',
  autoDismiss: 10,
  position: 'tr'
};

const successfullyUpdatedParameter = {
  title: 'Element updated',
  message: 'Vessel successfully updated',
  level: 'info',
  dismissible: 'button',
  autoDismiss: 10,
  position: 'tr'
};

const errorMessageParameter = {
  title: 'Error',
  message: 'Unfortunately, the last action failed. Please try again or contact your admin.',
  level: 'error',
  dismissible: 'button',
  autoDismiss: 30,
  position: 'tr'
};

export default class VesselsFetcher {
  static mockData = {};

  static fetchByCollectionId(id, queryParams = {}, isSync = false) {
    return BaseFetcher.fetchByCollectionId(id, queryParams, isSync, 'vessels', Vessel);
  }

  static fetchById(id) {
    const promise = fetch('/api/v1/vessels/'+id, {
      credentials: 'same-origin',
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json'
      },
      method: 'GET',
    })
      .then((response) => response.json())
      .then((json) => Vessel.createFromRestResponse(0, json))
      .catch((errorMessage) => {
        console.log(errorMessage);
      });
    return promise;
  }

  static create(vessel, user){
    const params = extractApiParameter(vessel);
    const promise = fetch('/api/v1/vessels', {
      credentials: 'same-origin',
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json'
      },
      method: 'POST',
      body: JSON.stringify(params)
    })
      .then((response) => response.json())
      .then((json) => Vessel.createFromRestResponse(params.collection_id, json)).then((vesselItem) => {
        user.vessels_count = user.vessels_count + 1;
        NotificationActions.add(successfullyCreatedParameter);
        return vesselItem;
      })
      .catch((errorMessage) => {
        console.log(errorMessage);
        NotificationActions.add(errorMessageParameter);
        return vessel;
      });
    return promise;
  }

  static update(vessel){
    const params = extractApiParameter(vessel);
    const promise = fetch('/api/v1/vessels', {
      credentials: 'same-origin',
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json'
      },
      method: 'PUT',
      body: JSON.stringify(params)
    })
      .then((response) => response.json())
      .then((json) => Vessel.createFromRestResponse(params.collection_id, json))
      .then((vesselItem) => {
        NotificationActions.add(successfullyUpdatedParameter);
        return vesselItem;
      })
      .catch((errorMessage) => {
        console.log(errorMessage);
        NotificationActions.add(errorMessageParameter);
        return vesselItem
      });
    return promise;
  }
}
