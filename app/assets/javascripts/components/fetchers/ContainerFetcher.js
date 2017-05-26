import BaseFetcher from './BaseFetcher'
import Container from '../models/Container'

export default class ContainerFetcher {

  static deleteContainer(container){
    return BaseFetcher.withoutBodyData({
      apiEndpoint: `/api/v1/containers/${container.id}`,
      requestMethod: 'DELETE',
      jsonTranformation: (json) => {new Container(json.container)}
    })
  }
}
