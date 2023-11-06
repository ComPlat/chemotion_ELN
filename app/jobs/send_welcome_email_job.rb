class SendWelcomeEmailJob < ApplicationJob
 
  queue_as :send_welcome_email
  
  def perform(user_id)
    # Skip in demo instance
    # WelcomeMailer.mail_welcome_message(user_id).deliver_now
  end
end
