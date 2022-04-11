class AddResolverNameToComments < ActiveRecord::Migration[5.2]
  def change
    add_column :comments, :resolver_name, :string
  end
end
