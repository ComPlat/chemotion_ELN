class AddSubmitterToComments < ActiveRecord::Migration[5.2]
  def change
    add_column :comments, :submitter, :string
  end
end
