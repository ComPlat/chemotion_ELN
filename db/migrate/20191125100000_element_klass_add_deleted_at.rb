class ElementKlassAddDeletedAt < ActiveRecord::Migration
  def change
    add_column :element_klasses, :deleted_at, :datetime unless column_exists? :element_klasses, :deleted_at
  end
end
