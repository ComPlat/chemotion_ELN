class UpdateFunctionGenerateUsersMatrixToVersion2 < ActiveRecord::Migration
  def change
    create_function :generate_users_matrix, version: 2
  end
end
