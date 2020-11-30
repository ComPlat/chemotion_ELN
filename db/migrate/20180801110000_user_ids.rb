class UserIds < ActiveRecord::Migration[4.2]
  def change
    create_function :user_ids
  end
end
