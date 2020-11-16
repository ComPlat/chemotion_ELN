class AppRestartMailJob < ApplicationJob
  queue_as :default

  def perform
    AppRestartMailer.send_mail&.deliver_now
  end
end
