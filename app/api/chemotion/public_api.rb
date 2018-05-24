module Chemotion
  class PublicAPI < Grape::API

    namespace :public do
      get 'ping' do
        status 200
      end

      resource :computed_props do
        params do
          requires :token, type: String
          requires :name, type: String

          requires :data, type: String
        end

        post do
          cconfig = Rails.configuration.compute_config
          error!('No computation configuration!') if cconfig.nil?
          error!('Unauthorized') unless cconfig.receiving_secret == params[:token]

          ComputedProp.from_raw(params[:name], params[:data])

          status 200
        end
      end

      namespace :affiliations do
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
          Swot::school_name "dummy@#{params[:domain]}"
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
                  a.update!(container_id: dataset.id)
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
