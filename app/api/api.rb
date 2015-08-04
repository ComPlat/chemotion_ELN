class API < Grape::API
  prefix 'api'
  version 'v1'
  formatter :json, Grape::Formatter::ActiveModelSerializers

  mount Chemotion::CollectionAPI
  mount Chemotion::SampleAPI
end
