class AddShortLabelToWellplates < ActiveRecord::Migration
  def change
    add_column :wellplates, :short_label, :string
    add_column :wellplates, :created_by, :integer

    add_column :users, :wellplate_name_prefix, :string, default: 'WP'
  end
end
