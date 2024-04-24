class LabimotionElementSplit < ActiveRecord::Migration[6.1]
  def self.up
    add_column :elements, :ancestry, :string, index: true unless column_exists? :elements, :ancestry
  end

  def self.down
    remove_column :elements, :ancestry if column_exists? :elements, :ancestry
  end
end