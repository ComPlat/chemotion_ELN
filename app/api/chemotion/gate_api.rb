module Chemotion
  class GateAPI < Grape::API
    resource :gate do
      get 'ping' do
        status 200
      end

      namespace :transmitting do
        params do
          requires :id, type: Integer, desc: 'Collection id'
        end

        after_validation do
          error!(
            '401 Unauthorized Access to Collection', 401
          ) unless @collection = Collection.find_by(
            id: params[:id], user_id: current_user.id, is_shared: false
          )
          error!('404 Token missing', 404) unless @jwt = AuthenticationKey.find_by(
            user_id: current_user.id, role: "gate out #{@collection.id}"
          )
        end
        route_param :id do
          get do
            resp = nil
            exp = Export::ExportJson.new(collection_id: @collection.id).export
            attachment_ids = exp.data.delete('attachments')
            attachments = Attachment.where(id: attachment_ids)
            data_file = Tempfile.new
            begin
              data_file.write(exp.to_json)
              data_file.rewind
              req_payload = {}
              req_payload[:data] = Faraday::UploadIO.new(
                  data_file.path, 'application/json', 'data.json'
              )
              tmp_files = []
              attachments.each do |att|
                cont_type = att.content_type || MimeMagic.by_path(att.filename)
                            .type
                tmp_files << Tempfile.new( encoding: 'ascii-8bit')
                tmp_files[-1].write(att.read_file)
                tmp_files[-1].rewind
                req_payload[att.identifier] = Faraday::UploadIO.new(
                  tmp_files[-1].path, cont_type, att.filename
                )
              end
              req_headers = {
                'Authorization' => "Bearer #{@jwt.token}",
                'Accept' => 'application/json',
              }
              payload_connection = Faraday.new(url: "http://"+@jwt.fqdn) do |f|
                f.request :multipart
                f.headers = req_headers
                f.adapter :net_http
              end
              resp = payload_connection.post do |req|
                req.url "/api/v1/gate/receiving"
                req.body = req_payload
              end
            ensure
              data_file.close
              data_file.unlink
              tmp_files.each do |tf|
                tf.close
                tf.unlink
              end
            end
            if resp.status.to_s =~ /20(0|1)/
              tr_col = @collection.children.find_or_create_by(user_id: @collection.user_id, label: 'transferred')
              CollectionsSample.move_to_collection(@collection.samples, @collection, tr_col.id)
              CollectionsReaction.move_to_collection(@collection.reactions, @collection, tr_col.id)
            end
            resp.status
          end
        end
      end

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
          imp.new_attachments.each_pair do |key, att|
            next unless (tmp = params[key]&.fetch('tempfile', nil))
            att.file_path = tmp.path
            att.created_by = @user.id
            att.save!
          end
          true
        end

      end

      namespace :register_gate do
        params do
          requires :collection_id, type: Integer, desc: 'Collection id'
          requires :destination, type: String, desc: 'remote eln adress'
          requires :token, type: String, desc: 'token'
        end
        after_validation do
          error!('401 Unauthorized', 401) unless @collec = Collection.find_by(
            id: params[:collection_id], user_id: current_user.id,
            is_shared: false
          )
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
          error!('401 Unauthorized', 401) unless @collec = Collection.find_by(
            id: params[:collection_id], user_id: current_user.id,
            is_shared: false
          )
        end

        get 'new' do
          payload = {
            collection: @collec.id,
            #label: @collec.label[0..20],
            iss: current_user.email
            # exp: Time.now + 7.days
          }
          payload[:origin] = params[:origin] if params[:origin]
          secret = Rails.application.secrets.secret_key_base
          token = JWT.encode payload, secret
          AuthenticationKey.create!(
            user_id: current_user.id,
            fqdn: params[:origin],
            role: "gate in",
            token: token
          )
          #TODO add a boolean on collection to allow AuthenticationKey
          # or use sync_collections_users ??
          {jwt: token}
        end
      end
    end
  end
end
