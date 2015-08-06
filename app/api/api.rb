class API < Grape::API
  prefix 'api'
  version 'v1'
  format :json
  formatter :json, Grape::Formatter::ActiveModelSerializers

  mount Chemotion::CollectionAPI
  mount Chemotion::SampleAPI
end
