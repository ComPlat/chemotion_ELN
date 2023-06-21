# frozen_string_literal: true

# rubocop: disable Metrics/ClassLength
module Chemotion
  # API: GateAPI to exchange data between two ELN servers
  class GateAPI < Grape::API
    class UriHTTPType
      def self.parse(value)
        URI.parse value
      end

      def self.parsed?(value)
        value.is_a? URI::HTTP
      end
    end

    desc 'GateAPI to exchange data between two ELN servers'
    resource :gate do
      desc <<~DESC
        ping gate service and check for proper JWT
        url path: './gate/ping'
        use to check if service is up and if the request header hast valid/known JWT
      DESC
      get 'ping' do
        http_token = (request.headers['Authorization'].split(' ').last if request.headers['Authorization'].present?)
        error!('Token missing', 401) unless http_token
        secret = Rails.application.secrets.secret_key_base
        begin
          @auth_token = ActiveSupport::HashWithIndifferentAccess.new(
            JWT.decode(http_token, secret)[0],
          )
        rescue JWT::VerificationError, JWT::DecodeError, JWT::ExpiredSignature => e
          error!("#{e}", 401)
        end
        error!('host vs origin mismatch', 401) unless request.headers['Origin'].start_with?(@auth_token[:origin])
        status 200
        { expire_at: Time.at(@auth_token[:exp]) }
      end

      desc <<~DESC
        transmit sample and reaction data from a given collection to a remote eln
        according to the collection associated AuthenticationKey. (authorization through session)
      DESC
      namespace :transmitting do
        params do
          requires :id, type: Integer, desc: 'Collection id'
          optional :target, type: UriHTTPType, default: API::TARGET
        end

        # Authorization and remote service checks.
        # Check proper acces to local collection and existence of an associated {AuthenticationKey},
        # and ping remote server for up service and JWT validation.
        after_validation do
          target = URI.join(params[:target], '/').to_s
          resp_body = { target: target }
          connection = Faraday.new(url: target) do |faraday|
            faraday.response :follow_redirects
          end
          begin
            resp = connection.get { |req| req.url('/api/v1/public/ping') }
            unless resp.success?
              resp_body['error'] = resp.reason_phrase
              error!(resp_body, resp.status)
            end
          rescue StandardError => e
            resp_body['error'] = e
            error!(resp_body, 503)
          end
          unless (@collection = Collection.find_by(
            id: params[:id], user_id: current_user.id
          ))
            resp_body['error'] = 'Unauthorized Access to Collection'
            error!(resp_body, 401)
          end
          unless (tokens = AuthenticationKey.where(
            user_id: current_user.id, role: "gate out #{@collection.id}",
          ))
            resp_body['error'] = 'Token missing for this collection'
            error!(resp_body, 404)
          end
          unless (@jwt = tokens.find_by(fqdn: target))
            resp_body['error'] = 'Token missing for the target'
            error!(resp_body, 404)
          end
          @url = @jwt.fqdn # fqdn should actually be eq to an orgin (proto/host/port)
          @req_headers = { 'Authorization' => "Bearer #{@jwt.token}", 'Origin' => request.headers['Referer'] }
          @move_queue = "move_to_collection_#{@collection.id}"
          # TODO: use persistent connection
          connection = Faraday.new(url: @url) do |faraday|
            faraday.response :follow_redirects
            faraday.headers = @req_headers
          end

          resp = connection.get { |req| req.url('/api/v1/gate/ping/') }
          resp_body.merge!(JSON.parse(resp.body)) if resp.headers['content-type'] == 'application/json'
          error!(resp_body, resp.status) unless resp.success?
          @resp_body = resp_body
        end

        route_param :id do
          get do
            @resp_body
          end
          post do
            TransferRepoJob.perform_later(@collection.id, current_user.id, @url, @req_headers)
            status 202
          end
        end
      end

      desc <<~DESC
        receive sample and reaction data from a remote eln and import them into a designated
        collection according to JWT info. (authentication through JWT)
      DESC
      namespace :receiving do
        params do
          requires :data, type: File
        end

        before do
          http_token = (request.headers['Authorization'].split(' ').last if request.headers['Authorization'].present?) # rubocop: disable Style/RedundantArgument
          error!('Unauthorized', 401) unless http_token
          secret = Rails.application.secrets.secret_key_base
          begin
            @auth_token = ActiveSupport::HashWithIndifferentAccess.new(
              JWT.decode(http_token, secret)[0],
            )
          rescue JWT::VerificationError, JWT::DecodeError, JWT::ExpiredSignature => e
            error!("#{e}", 401)
          end
          @user = Person.find_by(email: @auth_token[:iss])
          error!('Unauthorized', 401) unless @user
          @collection = Collection.find_by(
            id: @auth_token[:collection], user_id: @user.id
          )
          error!('Unauthorized access to collection', 401) unless @collection
        end

        post do
          db_file = params[:data]&.fetch('tempfile', nil)
          imp = Import::ImportJson.new(
            data: db_file.read,
            user_id: @user.id,
            collection_id: @collection.id,
          )
          imp.import
          new_attachments = []
          imp.new_attachments&.each_pair do |key, att|
            next unless (tmp = params[key]&.fetch('tempfile', nil))

            att.file_path = tmp.path
            att.created_by = @user.id
            att.created_for = nil
            att.save!
            new_attachments << att
          end
          status(200)
        end
      end

      namespace :register_gate do
        params do
          requires :collection_id, type: Integer, desc: 'Collection id'
          requires :destination, type: UriHTTPType, desc: 'remote eln adress'
          requires :token, type: String, desc: 'token'
        end
        after_validation do
          error!('401 Unauthorized', 401) unless (@collec = Collection.find_by(
            id: params[:collection_id], user_id: current_user.id
          ))
        end
        post do
          AuthenticationKey.create!(
            user_id: current_user.id,
            fqdn: params[:destination],
            role: "gate out #{@collec.id}",
            token: params[:token],
          )
          nil
        end
      end

      namespace :register_repo do
        params do
          requires :token, type: String, desc: 'token'
        end

        after_validation do
          error!('Unauthorized', 401) unless (@collec = Collection.find_by(
            user_id: current_user.id, is_locked: true, label: 'chemotion-repository.net',
          ))
        end

        get do
          ak = AuthenticationKey.find_or_initialize_by(
            user_id: current_user.id,
            fqdn: API::TARGET,
            role: "gate out #{@collec.id}",
          )
          ak.token = params[:token]
          ak.save!
          redirect('/')
        end
      end

      namespace :jwt do
        params do
          requires :collection_id, type: Integer, desc: 'Collection id'
          optional :origin, type: UriHTTPType, desc: 'remote eln adress'
        end

        after_validation do
          error!('401 Unauthorized', 401) unless (@collec = Collection.find_by(
            id: params[:collection_id], user_id: current_user.id
          ))
        end

        get 'new' do
          payload = {
            collection: @collec.id,
            # label: @collec.label[0..20],
            iss: current_user.email,
            exp: 7.days.from_now.to_i,
          }
          payload[:origin] = params[:origin] if params[:origin]
          secret = Rails.application.secrets.secret_key_base
          token = JWT.encode payload, secret
          AuthenticationKey.create!(
            user_id: current_user.id,
            fqdn: params[:origin],
            role: 'gate in',
            token: token,
          )
          # TODO: add a boolean on collection to allow AuthenticationKey
          # or use sync_collections_users ??
          { jwt: token }
        end
      end
    end
  end
end
# rubocop: enable Metrics/ClassLength
