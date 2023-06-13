# frozen_string_literal: true

# Mailer to email an ELNer about its data export being ready for download
class AnalysesMailer < ApplicationMailer
  def mail_export_completed(user_id, short_label, link, expires_at)
    init_export_params(user_id, short_label, link, expires_at)
    mail(to: @user.email, subject: "[ELN] Analyses download of sample: #{short_label}") do |format|
      format.html
      format.text { render plain: export_mail_content }
    end
  end

  private

  def export_mail_content
    <<~TXT
      Analyses download job completed!
      Your data has been packed.
      Analyses of sample: #{@short_label}.
      Download link (expires at #{@expires_at}):

        #{@link}
    TXT
  end

  def init_export_params(user_id, short_label, link, expires_at)
    @user = User.find(user_id)
    @link = link
    @short_label = short_label
    @expires_at = expires_at
  end
end
