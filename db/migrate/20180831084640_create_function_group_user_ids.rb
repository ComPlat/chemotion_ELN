class CreateFunctionGroupUserIds < ActiveRecord::Migration[4.2]
  def change
    create_function :group_user_ids
  end
end
