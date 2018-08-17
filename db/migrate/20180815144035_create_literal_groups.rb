class CreateLiteralGroups < ActiveRecord::Migration
  def change
    create_view :literal_groups
  end
end
