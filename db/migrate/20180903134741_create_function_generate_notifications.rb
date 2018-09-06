class CreateFunctionGenerateNotifications < ActiveRecord::Migration
  def change
    create_function :generate_notifications
  end
end
