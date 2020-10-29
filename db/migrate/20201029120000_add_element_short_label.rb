class AddElementShortLabel < ActiveRecord::Migration
  def change
    add_column :element_klasses, :klass_prefix, :string, null: false, default: 'E' unless column_exists? :element_klasses, :klass_prefix
    add_column :elements, :short_label, :string, null: true unless column_exists? :elements, :short_label
  end
end
