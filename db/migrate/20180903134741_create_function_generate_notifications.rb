class CreateFunctionGenerateNotifications < ActiveRecord::Migration[4.2]
  def change
    create_function :generate_notifications
  end
end
