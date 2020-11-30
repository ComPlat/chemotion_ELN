class UpdateFunctionGenerateUsersMatrixToVersion2 < ActiveRecord::Migration[4.2]
  def change
    create_function :generate_users_matrix, version: 2
  end
end
