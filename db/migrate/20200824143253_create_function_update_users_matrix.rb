class CreateFunctionUpdateUsersMatrix < ActiveRecord::Migration[4.2]
  def change
    create_function :update_users_matrix
  end
end
