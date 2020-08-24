class CreateFunctionGenerateUsersMatrix < ActiveRecord::Migration
  def change
    create_function :generate_users_matrix
  end
end
