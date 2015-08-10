class API < Grape::API
  prefix 'api'
  version 'v1'
  format :json
  formatter :json, Grape::Formatter::ActiveModelSerializers

  # TODO needs to be tested,
  # source: http://funonrails.com/2014/03/api-authentication-using-devise-token/
  helpers do
    def warden
      env['warden']
    end

    def current_user
      @current_user = warden.user
    end

    def authenticate!
      error!('401 Unauthorized', 401) unless current_user
    end
  end

  before do
    authenticate!
  end

  mount Chemotion::CollectionAPI
  mount Chemotion::SampleAPI
end
