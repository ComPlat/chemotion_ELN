require_relative './authentication'

class API < Grape::API
  prefix 'api'
  version 'v1'
  format :json
  formatter :json, Grape::Formatter::ActiveModelSerializers

  # TODO needs to be tested,
  # source: http://funonrails.com/2014/03/api-authentication-using-devise-token/
  helpers do
    def current_user
      @current_user = Authentication.new(env).current_user
    end

    def authenticate!
      error!('401 Unauthorized', 401) unless current_user
    end

    def authorize!
      error!('401 Unauthorized', 401) unless Authorization.new(current_user, env, params).request_valid?
    end
  end

  before do
    authenticate!
    authorize!
  end

  mount Chemotion::LiteratureAPI
  mount Chemotion::CollectionAPI
  mount Chemotion::SampleAPI
  mount Chemotion::ReactionAPI
  mount Chemotion::WellplateAPI
  mount Chemotion::UserAPI
end
