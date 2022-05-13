#module API
require 'grape-entity'
require 'grape-swagger'
require 'moneta'

class API < Grape::API
  format :json
  prefix :api
  version 'v1'
  formatter :json, Grape::Formatter::ActiveModelSerializers

  # TODO needs to be tested,
  # source: http://funonrails.com/2014/03/api-authentication-using-devise-token/
  helpers do

    def current_user
      @current_user ||= API::WardenAuthentication.new(env).current_user
    end

    def cache
      @cache = Moneta::Adapters::Memcached.new(expires: 60 * 60 * 24 * 7) if @cache.nil?
    end

    def user_ids
      @user_ids ||= current_user ? (current_user.group_ids + [current_user.id]) : [0]
    end

    def authenticate!
      error!('401 Unauthorized', 401) unless current_user
    end

    def authenticate_request!
      author_request = AuthorizeApiRequest.call(request.headers, cache)
      error!('401 Unauthorized', 401) if author_request.errors.present?

      @current_user_id = author_request.result
      error!('401 Unauthorized', 401) if @current_user_id.nil?
    end

    def jwt_request?
      request.path.start_with?(
        '/api/v1/attachments_jwt'
      )
    end

    def is_public_request?
      request.path.start_with?(
        '/api/v1/public/',
        '/api/v1/chemscanner/',
        '/api/v1/chemspectra/',
        '/api/v1/ketcher/layout',
        '/api/v1/gate/receiving',
        '/api/v1/gate/ping',
        '/api/v1/attachments_jwt'
      )
    end

    def http_auth_header
      if headers['Authorization'].present?
        return headers['Authorization'].split(' ').last
      else
        errors.add(:token, 'Missing token')
      end
  
      nil
    end

    def cache_key search_method, arg, molfile, collection_id, molecule_sort, opt
      molecule_sort = molecule_sort == 1 ? true : false
      inchikey = Chemotion::OpenBabelService.inchikey_from_molfile molfile

      cache_key = [
        latest_updated,
        search_method,
        arg,
        inchikey,
        collection_id,
        molecule_sort,
        opt
      ]

      return cache_key
    end

    def to_snake_case_key(k)
      k.to_s.underscore.to_sym
    end

    def to_rails_snake_case(val)
      case val
      when Array
        val.map { |v| to_rails_snake_case(v) }
      when Hash
        Hash[val.map { |k, v| [to_snake_case_key(k), to_rails_snake_case(v)] }]
      else
        val
      end
    end

    def to_camelcase_key(k)
      k.to_s.camelcase(:lower).to_sym
    end

    def to_json_camel_case(val)
      case val
      when Array
        val.map { |v| to_json_camel_case(v) }
      when Hash
        Hash[val.map { |k, v| [to_camelcase_key(k), to_json_camel_case(v)] }]
      else
        val
      end
    end
  end


  before do
    authenticate! unless is_public_request?
    authenticate_request! if jwt_request?
  end

  # desc: whitelisted tables and columns for advanced_search
  WL_TABLES = {
    'samples' => %w(name short_label external_label xref)
  }
  TARGET = Rails.env.production? ? 'https://www.chemotion-repository.net/' : 'http://localhost:3000/'

  ELEMENTS = %w[research_plan screen wellplate reaction sample]

  TEXT_TEMPLATE = %w[SampleTextTemplate ReactionTextTemplate WellplateTextTemplate ScreenTextTemplate ResearchPlanTextTemplate ReactionDescriptionTextTemplate ElementTextTemplate ]

  mount Chemotion::LiteratureAPI
  mount Chemotion::ContainerAPI
  mount Chemotion::MoleculeAPI
  mount Chemotion::CollectionAPI
  mount Chemotion::SyncCollectionAPI
  mount Chemotion::SampleAPI
  mount Chemotion::ReactionAPI
  mount Chemotion::WellplateAPI
  mount Chemotion::ResearchPlanAPI
  mount Chemotion::ResearchPlanMetadataAPI
  mount Chemotion::ScreenAPI
  mount Chemotion::UserAPI
  mount Chemotion::ReactionSvgAPI
  mount Chemotion::PermissionAPI
  mount Chemotion::SuggestionAPI
  mount Chemotion::SearchAPI
  mount Chemotion::ReportAPI
  mount Chemotion::AttachmentAPI
  mount Chemotion::PublicAPI
  mount Chemotion::ProfileAPI
  mount Chemotion::CodeLogAPI
  mount Chemotion::DeviceAPI
  mount Chemotion::InboxAPI
  mount Chemotion::IconNmrAPI
  mount Chemotion::DevicesAnalysisAPI
  mount Chemotion::GateAPI
  mount Chemotion::ElementAPI
  mount Chemotion::ChemScannerAPI
  mount Chemotion::ChemSpectraAPI
  mount Chemotion::InstrumentAPI
  mount Chemotion::MessageAPI
  mount Chemotion::AdminAPI
  mount Chemotion::EditorAPI
  mount Chemotion::UiAPI
  mount Chemotion::OlsTermsAPI
  mount Chemotion::PredictionAPI
  mount Chemotion::ComputeTaskAPI
  mount Chemotion::TextTemplateAPI
  mount Chemotion::GenericElementAPI
  mount Chemotion::SegmentAPI
  mount Chemotion::GenericDatasetAPI
  mount Chemotion::ReportTemplateAPI
  mount Chemotion::PrivateNoteAPI
  mount Chemotion::NmrdbAPI
  mount Chemotion::ConverterAPI
  mount Chemotion::AttachmentJwtAPI
  mount Chemotion::PartnerAppAPI

  add_swagger_documentation(info: {
    "title": "Chemotion ELN",
    "version": "1.0"
  })
end
