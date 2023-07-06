# frozen_string_literal: true

# rubocop: disable Metrics/ClassLength

module Chemotion
  class PublicAPI < Grape::API
    helpers do
      def send_notification(attachment, user, status, has_error = false)
        data_args = { 'filename': attachment.filename, 'comment': 'the file has been updated' }
        level = 'success'
        if has_error
          data_args['comment'] = ' an error has occurred, the file is not changed.'
          level = 'error'
        elsif status == 4
          data_args['comment'] = ' file has not changed.'
          level = 'info'
        elsif @status == 7
          data_args['comment'] = ' an error has occurred while force saving the document, please review your changes.'
          level = 'error'
        end
        Message.create_msg_notification(
          channel_subject: Channel::EDITOR_CALLBACK, message_from: user.id,
          data_args: data_args, attach_id: attachment.id, research_plan_id: attachment.attachable_id, level: level
        )
      end
    end

    namespace :public do
      get 'ping' do
        status 204
      end

      namespace :token do
        desc 'Generate Token'
        params do
          requires :username, type: String, desc: 'Username'
          requires :password, type: String, desc: 'Password'
        end
        post do
          token = Usecases::Public::BuildToken.execute!(params)
          error!('401 Unauthorized', 401) if token.blank?

          { token: token }
        end
      end


      namespace :omniauth_providers do
        desc 'get omniauth providers'
        get do
          res = {}
          config = Devise.omniauth_configs
          extra_rules = Matrice.extra_rules
          config.each do |k, _v|
            res[k] = { icon: File.basename(config[k].options[:icon] || ''), label: config[k].options[:label] }
          end
          { omniauth_providers: res, extra_rules: extra_rules }
        end
      end

      namespace :download do
        desc 'download file for editoring'
        before do
          error!('401 Unauthorized', 401) if params[:token].nil?
        end
        get do
          content_type 'application/octet-stream'
          payload = JsonWebToken.decode(params[:token])
          error!('401 Unauthorized', 401) if payload.empty?

          att_id = payload['att_id']&.to_i
          user_id = payload['user_id']&.to_i
          @attachment = Attachment.find_by(id: att_id)
          @user = User.find_by(id: user_id)
          error!('401 Unauthorized', 401) if @attachment.nil? || @user.nil?
          header['Content-Disposition'] = "attachment; filename=\"#{@attachment.filename}\""
          env['api.format'] = :binary
          @attachment.read_file
        end
      end

      namespace :callback do
        desc 'start to save a document'
        # callback status description
        # 0 - no document with the key identifier could be found,
        # 1 - document is being edited,
        # 2 - document is ready for saving,
        # 3 - document saving error has occurred,
        # 4 - document is closed with no changes,
        # 6 - document is being edited, but the current document state is saved,
        # 7 - error has occurred while force saving the document.
        after_validation do
          error!('401 Unauthorized', 401) if params[:key].nil?
          payload = JsonWebToken.decode(params[:key])
          error!('401 Unauthorized', 401) if payload.empty?
          @status = params[:status].is_a?(Integer) ? params[:status] : 0

          if @status > 1
            attach_id = payload['att_id']&.to_i
            @url = params[:url]
            @attachment = Attachment.editing.find_by(id: attach_id)
            error!("404 Not Found, edited attachment id: #{attach_id}", 404) unless @attachment
            user_id = payload['user_id']&.to_i
            @user = User.find_by(id: user_id)
            error!('401 Unauthorized', 401) if @user.nil?
          end
        end

        params do
          optional :key, type: String, desc: 'token'
          optional :status, type: Integer, desc: 'status (see description)'
          optional :url, type: String, desc: 'file url'
        end
        get do
          status 200
          { error: 0 }
        end

        post do
          # begin
          case @status
          when 1
          when 2
            # prevent saving if the file is not locked for editing
            error!('401 Unauthorized', 401) if @attachment.not_editing?

            @attachment.file_data = open(@url).read
            @attachment.rewrite_file_data!
            @attachment.editing_end!
          else
            @attachment.editing_end!
          end
          send_notification(@attachment, @user, @status) unless @status <= 1
          # rescue StandardError => err
          # Rails.logger.error(
          #   <<~LOG
          #   **** OO editor error while saving *****************
          #   #{params}
          #   #{err}
          #   LOG
          # )
          #   send_notification(@attachment, @user, @status, true)
          # end
          status 200
          { error: 0 }
        end
      end

      resource :computed_props do
        params do
          requires :token, type: String
          requires :compute_id, type: Integer

          requires :data, type: String
        end

        post do
          cconfig = Rails.configuration.compute_config
          error!('No computation configuration!') if cconfig.nil?
          error!('Unauthorized') unless cconfig.receiving_secret == params[:token]

          cp = ComputedProp.find(params[:compute_id])
          return if cp.nil?

          cp.status = params[:code]&.downcase

          begin
            ComputedProp.from_raw(cp.id, params[:data])
          rescue StandardError => e
            Rails.logger.error("ComputedProp calculation fail: #{e.message}")
            cp.status = 'failure'
            cp.save!
          end
          cp = ComputedProp.find(params[:compute_id])
          Message.create_msg_notification(
            channel_subject: Channel::COMPUTED_PROPS_NOTIFICATION, message_from: cp.creator,
            data_args: { sample_id: cp.sample_id, status: cp.status }, cprop: ComputedProp.find(cp.id),
            level: %w[success completed].include?(cp.status) ? 'success' : 'error'
          )
        end
      end
    end
  end
end

# rubocop: enable Metrics/ClassLength
