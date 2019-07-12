class UpdateFunctionGenerateNotifications < ActiveRecord::Migration
  def change
    create_function :generate_notifications
  end
end
