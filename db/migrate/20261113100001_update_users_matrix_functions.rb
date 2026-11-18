# frozen_string_literal: true

# generate_users_matrix v03 skips soft-deleted matrices.
# update_users_matrix v02 compares old and new rows NULL-safely, so that soft-deleting
# or restoring a matrice (deleted_at) regenerates the users' matrix, and also handles DELETE.
# update_users_matrix_trg v02 also fires on DELETE, so hard deletes regenerate it too.
#
# create_function issues CREATE OR REPLACE; update_function would DROP the function
# first, which fails because update_users_matrix_trg depends on update_users_matrix.
#
# Replacing a function does not touch the stored masks, so they are regenerated with
# the version just installed (e.g. to drop the bits of features already soft-deleted).
class UpdateUsersMatrixFunctions < ActiveRecord::Migration[6.1]
  def up
    create_function :generate_users_matrix, version: 3
    create_function :update_users_matrix, version: 2
    update_trigger :update_users_matrix_trg, on: :matrices, version: 2, revert_to_version: 1
    regenerate_users_matrix
  end

  def down
    update_trigger :update_users_matrix_trg, on: :matrices, version: 1, revert_to_version: 2
    create_function :generate_users_matrix, version: 2
    create_function :update_users_matrix, version: 1
    regenerate_users_matrix
  end

  private

  def regenerate_users_matrix
    execute('SELECT generate_users_matrix(null)')
  end
end
