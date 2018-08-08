class UserIds < ActiveRecord::Migration
  def change
    create_function :user_ids
  end
end
