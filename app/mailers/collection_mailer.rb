class CollectionMailer < ActionMailer::Base
    default from: ENV['DEVISE_SENDER'] || 'eln'

    def export_mail_content
      <<~TXT
      Export collection job is completed!
      Your Collection(s): [#{@col_labels}] has been exported.
      You can download it from below link (only available today!):
        #{@url}
      TXT
    end

    def init_export_params(job_id, collection_ids, ext, user_id)

      if Rails.env.production?
        @proto = "https://"
        @host = ENV['SMTP_DOMAIN'] || "complat-eln.ioc.kit.edu"
      else
        @proto = "http://"
        @host = ENV['HOST'] || "localhost:3000"
      end

      @job_id = job_id
      @ext = ext
      @user = User.find(user_id)
      @col_labels = Collection.where(id: collection_ids).pluck(:label).join(',')
      @url = @proto + @host + '/zip/' + job_id + '.' + ext
    end

    def export_notification
      channel = Channel.find_by(subject: Channel::COLLECTION_ZIP)
      content = channel.msg_template unless channel.nil?
      return if content.nil?

      content['data'] = format(content['data'], { col_labels: @col_labels,  operate: 'exported'})
      content['url'] = @url
      content['url_title'] = 'Download'
      Message.create_msg_notification(channel.id, content,  @user.id, [@user.id])
    end

    def mail_export_completed(job_id, collection_ids, ext, user_id)
      init_export_params(job_id, collection_ids, ext, user_id)
      export_notification
      mail(to: @user.email, subject: "[ELN] Collection has been exported: [" + @col_labels + "]" ) do |format|
        format.html
        format.text { render plain: export_mail_content }
      end
    end

  end
