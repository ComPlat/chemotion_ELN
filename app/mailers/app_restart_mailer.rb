class AppRestartMailer < ActionMailer::Base
  default from: ENV['DEVISE_SENDER'] || 'eln'

  def text_content
    "The application was restarted.\n#{revision}"
  end

  def revision
    if File.exist?('../../revisions.log')
      `tail -n 1 ../../revisions.log`
    end
  end

  def send_mail
    unless ENV['ADM_EMAILS'].blank?
      mail(to: ENV['ADM_EMAILS'], subject: "Rails app restarted") do |format|
        format.text { render plain: text_content }
      end
    end
  end
end
