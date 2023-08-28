import Vessel from 'src/models/Vessel';
import { extractApiParameter } from '../utilities/VesselUtils';
import BaseFetcher from 'src/fetchers/BaseFetcher';

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
        return vesselItem;
      })
      .catch((errorMessage) => {
        console.log(errorMessage);
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
      .catch((errorMessage) => {
        console.log(errorMessage);
      });
    return promise;
  }
}
