class CreateNotifyMessages < ActiveRecord::Migration
  def change
    create_view :notify_messages
  end
end
