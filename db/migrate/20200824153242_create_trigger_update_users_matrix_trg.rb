class CreateTriggerUpdateUsersMatrixTrg < ActiveRecord::Migration
  def change
    create_trigger :update_users_matrix_trg, on: :matrices
  end
end
