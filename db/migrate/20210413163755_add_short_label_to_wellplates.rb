class AddShortLabelToWellplates < ActiveRecord::Migration
  def up
    add_column :wellplates, :short_label, :string

    Wellplate.all.each { |wp| wp.update_columns(short_label: "WP#{wp.id}") }
  end

  def down
    remove_column :wellplates, :short_label
  end
end
