class API < Grape::API
  prefix 'api'
  version 'v1'
  format :json
  formatter :json, Grape::Formatter::ActiveModelSerializers

  # TODO needs to be tested,
  # source: http://funonrails.com/2014/03/api-authentication-using-devise-token/
  helpers do
    def current_user
      @current_user = WardenAuthentication.new(env).current_user
    end

    def authenticate!
      error!('401 Unauthorized', 401) unless current_user
    end

    def is_public_request?
      request.path.include?('/api/v1/public/')
    end
  end

  before do
    authenticate! unless is_public_request?
  end

  mount Chemotion::MoleculeAPI
  mount Chemotion::CollectionAPI
  mount Chemotion::SampleAPI
  mount Chemotion::ReactionAPI
  mount Chemotion::WellplateAPI
  mount Chemotion::ScreenAPI
  mount Chemotion::UserAPI
  mount Chemotion::ReactionSvgAPI
  mount Chemotion::PermissionAPI
  mount Chemotion::SuggestionAPI
  mount Chemotion::SearchAPI
  mount Chemotion::ReportAPI
  mount Chemotion::AttachmentAPI
  mount Chemotion::PublicAPI
  mount Chemotion::KetcherAPI
end
