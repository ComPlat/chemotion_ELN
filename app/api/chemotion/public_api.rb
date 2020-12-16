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
        message = Message.create_msg_notification(
          channel_subject: Channel::EDITOR_CALLBACK, message_from: user.id,
          data_args: data_args, attach_id: attachment.id, research_plan_id: attachment.attachable_id, level: level
        )
      end
    end

    namespace :public do
      get 'ping' do
        status 204
      end

      namespace :download do
        desc 'download file for editoring'
        before do
          error!('401 Unauthorized', 401) if params[:token].nil?
        end
        get do
          content_type "application/octet-stream"
          payload = JWT.decode(params[:token], Rails.application.secrets.secret_key_base) unless params[:token].nil?
          error!('401 Unauthorized', 401) if payload&.length == 0
          att_id = payload[0]['att_id']&.to_i
          user_id = payload[0]['user_id']&.to_i
          @attachment = Attachment.find_by(id: att_id)
          @user = User.find_by(id: user_id)
          error!('401 Unauthorized', 401) if @attachment.nil? || @user.nil?

          header['Content-Disposition'] = "attachment; filename=" + @attachment.filename
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
        before do
          error!('401 Unauthorized', 401) if params[:key].nil?
          payload = JWT.decode(params[:key], Rails.application.secrets.secret_key_base) unless params[:key].nil?
          error!('401 Unauthorized', 401) if payload&.length == 0
          @status = params[:status].is_a?(Integer) ? params[:status] : 0

          if @status > 1
            attach_id = payload[0]['att_id']&.to_i
            @url = params[:url]
            @attachment = Attachment.find_by(id: attach_id, attachable_type: 'ResearchPlan')
            user_id = payload[0]['user_id']&.to_i
            @user = User.find_by(id: user_id)
            error!('401 Unauthorized', 401) if @attachment.nil? || @user.nil?
            @research_plan = @attachment.attachable if @attachment.attachable_type == 'ResearchPlan'
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
            @attachment.file_data = open(@url).read
            @attachment.rewrite_file_data!
            @attachment.oo_editing_end!
          else
            @attachment.oo_editing_end!
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

          cp.status = params[:code]

          ComputedProp.from_raw(cp.id, params[:data])

          Message.create_msg_notification(
            channel_subject: Channel::COMPUTED_PROPS_NOTIFICATION, message_from: cp.creator,
            data_args: { sample_id: cp.sample_id, status: 'finished'}, cprop: ComputedProp.find(cp.id),
            level: 'success'
          )
        end
      end

      namespace :affiliations do
        params do
          optional :domain, type: String, desc: "email domain", regexp: /\A([a-z\d\-]+\.)+[a-z]{2,64}\z/i
        end

        desc "Return all countries available"
        get "countries" do
          ISO3166::Country.all_translated
        end

        desc "Return all current organizations"
        get "organizations" do
          Affiliation.pluck("DISTINCT organization")
        end

        desc "Return all current departments"
        get "departments" do
          Affiliation.pluck("DISTINCT department")
        end

        desc "Return all current groups"
        get "groups" do
          Affiliation.pluck("DISTINCT affiliations.group")
        end

        desc "return organization's name from email domain"
        get "swot" do
          return unless params[:domain].present?
          Swot::school_name(params[:domain]).presence ||
            Affiliation.where(domain: params[:domain]).where.not(organization: nil).first&.organization
        end
      end
    end

    namespace :upload do
      before do
        error!('Unauthorized' , 401) unless TokenAuthentication.new(request, with_remote_addr: true).is_successful?
      end
      resource :attachments do
        desc "Upload files"
        params do
          requires :recipient_email, type: String
          requires :subject, type: String
        end
        post do
          recipient_email = params[:recipient_email]
          subject = params[:subject]
          params.delete(:subject)
          params.delete(:recipient_email)

          token = request.headers['Auth-Token'] || request.params['auth_token']
          key = AuthenticationKey.find_by(token: token)


          helper = CollectorHelper.new(key.user.email , recipient_email)

          if helper.sender_recipient_known?
            dataset = helper.prepare_new_dataset(subject)
            params.each do |file_id, file|
              if tempfile = file.tempfile
                a = Attachment.new(
                  filename: file.filename,
                  file_path: file.tempfile,
                  created_by: helper.sender.id,
                  created_for: helper.recipient.id,
                  content_type: file.type
                )
                begin
                  a.save!
                  a.update!(attachable: dataset)
                  primary_store = Rails.configuration.storage.primary_store
                  a.update!(storage: primary_store)
                ensure
                  tempfile.close
                  tempfile.unlink
                end
              end
            end
          end
          true
        end
      end
    end
  end
end
