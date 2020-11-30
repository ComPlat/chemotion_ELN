class CreateNotifyMessages < ActiveRecord::Migration[4.2]
  def change
    create_view :notify_messages
  end
end
