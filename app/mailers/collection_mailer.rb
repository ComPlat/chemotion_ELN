# Mailer to email an ELNer about its data export being ready for download
class CollectionMailer < ActionMailer::Base
  default from: ENV['DEVISE_SENDER'] || 'eln'

  def mail_export_completed(user_id, labels, link, expires_at)
    init_export_params(user_id, labels, link, expires_at)
    mail(to: @user.email, subject: "[ELN] Collection export:  #{@col_labels}") do |format|
      format.html
      format.text { render plain: export_mail_content }
    end
  end

  private

  def export_mail_content
    <<~TXT
      Export collection job completed!
      Your data has been packed.
      Collection#{@s}: #{@col_labels}.
      Download link (expires at #{@expires_at}):

        #{@link}
    TXT
  end

  def init_export_params(user_id, labels, link, expires_at)
    @user = User.find(user_id)
    @link = link
    @expires_at = expires_at
    @s = labels.size > 1 ? 's' : ''
    @col_labels = "[#{labels.join('], [')}]"
    @col_labels = (@col_labels[0..40] + '...') if @col_labels.size > 40
  end
end
