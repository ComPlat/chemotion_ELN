class CreateLiteralGroups < ActiveRecord::Migration[4.2]
  def change
    create_view :literal_groups
  end
end
