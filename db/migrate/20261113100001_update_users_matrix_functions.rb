# frozen_string_literal: true

# generate_users_matrix v03 skips soft-deleted matrices.
# update_users_matrix v02 compares old and new rows NULL-safely, so that soft-deleting
# or restoring a matrice (deleted_at) regenerates the users' matrix.
#
# create_function issues CREATE OR REPLACE; update_function would DROP the function
# first, which fails because update_users_matrix_trg depends on update_users_matrix.
class UpdateUsersMatrixFunctions < ActiveRecord::Migration[6.1]
  def up
    create_function :generate_users_matrix, version: 3
    create_function :update_users_matrix, version: 2
  end

  def down
    create_function :generate_users_matrix, version: 2
    create_function :update_users_matrix, version: 1
  end
end
