class CreateTriggerUpdateUsersMatrixTrg < ActiveRecord::Migration[4.2]
  def change
    create_trigger :update_users_matrix_trg, on: :matrices
  end
end
