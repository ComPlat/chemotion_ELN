class CreateFunctionGenerateUsersMatrix < ActiveRecord::Migration[4.2]
  def change
    create_function :generate_users_matrix
  end
end
