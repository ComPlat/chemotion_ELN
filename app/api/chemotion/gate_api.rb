module Chemotion
  # API: GateAPI to exchange data between two ELN servers
  class GateAPI < Grape::API
    desc 'GateAPI to exchange data between two ELN servers'
    resource :gate do
      desc <<~DESC
        ping gate service and check for proper JWT
        url path: './gate/ping'
        use to check if service is up and if the request header hast valid/known JWT
      DESC
      get 'ping' do
        http_token = if request.headers['Authorization'].present?
                       request.headers['Authorization'].split(' ').last
                     end
        error!('401 Unauthorized', 401) unless http_token
        secret = Rails.application.secrets.secret_key_base
        begin
          @auth_token = HashWithIndifferentAccess.new(
            JWT.decode(http_token, secret)[0]
          )
        rescue JWT::VerificationError, JWT::DecodeError => e
          error!("401 #{e}", 401)
        end
        status 200
      end

      desc <<~DESC
        transmit sample and reaction data from a given collection to a remote eln
        according to the collection associated AuthenticationKey. (authorization through session)
      DESC
      namespace :transmitting do
        params do
          requires :id, type: Integer, desc: 'Collection id'
        end

        # Authorization and remote service checks.
        # Check proper acces to local collection and existence of an associated {AuthenticationKey},
        # and ping remote server for up service and JWT validation.
        after_validation do
          unless (@collection = Collection.find_by(
            id: params[:id], user_id: current_user.id, is_shared: false
          ))
            error!('401 Unauthorized Access to Collection', 401)
          end
          error!('404 Token missing', 404) unless (@jwt = AuthenticationKey.find_by(
            user_id: current_user.id, role: "gate out #{@collection.id}"
          ))
          @url = "http#{'s' if Rails.env.production?}://#{@jwt.fqdn}"
          @req_headers = { 'Authorization' => "Bearer #{@jwt.token}" }
          @queue = "gate_transfer_#{@collection.id}"
          # TODO: use persistent connection
          connection = Faraday.new(url: @url) do |f|
            f.use FaradayMiddleware::FollowRedirects
            f.headers = @req_headers
            f.adapter :net_http
          end
          resp = connection.get { |req| req.url('/api/v1/gate/ping') }
          error!(resp.reason_phrase, resp.status) unless resp.success?
        end

        route_param :id do
          get do
            Delayed::Job.where(queue: @queue).destroy_all
            GateTransferJob.set(queue: @queue)
                           .perform_later(@collection.id, @url, @req_headers)
            status 204
          end

          delete do
            Delayed::Job.where(queue: @queue).destroy_all && status(202)
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
          http_token = if request.headers['Authorization'].present?
                         request.headers['Authorization'].split(' ').last
                       end
          error!('401 Unauthorized', 401) unless http_token
          secret = Rails.application.secrets.secret_key_base
          begin
            @auth_token = HashWithIndifferentAccess.new(
              JWT.decode(http_token, secret)[0]
            )
          rescue JWT::VerificationError, JWT::DecodeError => e
            error!("401 #{e}", 401)
          end
          @user = Person.find_by(email: @auth_token[:iss])
          error!('401 Unauthorized', 401) unless @user
          @collection = Collection.find_by(
            id: @auth_token[:collection], user_id: @user.id, is_shared: false
          )
          error!('401 Unauthorized access to collection', 401) unless @collection
        end

        post do
          db_file = params[:data]&.fetch('tempfile', nil)
          imp = Import::ImportJson.new(
            data: db_file.read,
            user_id: @user.id,
            collection_id: @collection.id
          )
          imp.import
          primary_store = Rails.configuration.storage.primary_store
          new_attachments = []
          imp.new_attachments.each_pair do |key, att|
            next unless (tmp = params[key]&.fetch('tempfile', nil))
            att.file_path = tmp.path
            att.created_by = @user.id
            att.created_for = nil
            att.save!
            new_attachments << att
          end
          # TODO: delayed_jobs this
          new_attachments.each { |att| att.update!(storage: primary_store) }
          status(200)
        end
      end

      namespace :register_gate do
        params do
          requires :collection_id, type: Integer, desc: 'Collection id'
          requires :destination, type: String, desc: 'remote eln adress'
          requires :token, type: String, desc: 'token'
        end
        after_validation do
          error!('401 Unauthorized', 401) unless (@collec = Collection.find_by(
            id: params[:collection_id], user_id: current_user.id,
            is_shared: false
          ))
        end
        post do
          AuthenticationKey.create!(
            user_id: current_user.id,
            fqdn: params[:destination],
            role: "gate out #{@collec.id}",
            token: params[:token]
          )
          nil
        end
      end

      namespace :jwt do
        params do
          requires :collection_id, type: Integer, desc: 'Collection id'
          optional :origin, type: String, desc: 'remote eln adress'
        end

        after_validation do
          error!('401 Unauthorized', 401) unless (@collec = Collection.find_by(
            id: params[:collection_id], user_id: current_user.id,
            is_shared: false
          ))
        end

        get 'new' do
          payload = {
            collection: @collec.id,
            # label: @collec.label[0..20],
            iss: current_user.email
            # exp: Time.now + 7.days
          }
          payload[:origin] = params[:origin] if params[:origin]
          secret = Rails.application.secrets.secret_key_base
          token = JWT.encode payload, secret
          AuthenticationKey.create!(
            user_id: current_user.id,
            fqdn: params[:origin],
            role: 'gate in',
            token: token
          )
          # TODO: add a boolean on collection to allow AuthenticationKey
          # or use sync_collections_users ??
          { jwt: token }
        end
      end
    end
  end
end
