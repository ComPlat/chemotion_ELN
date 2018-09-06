class CreateFunctionGroupUserIds < ActiveRecord::Migration
  def change
    create_function :group_user_ids
  end
end
