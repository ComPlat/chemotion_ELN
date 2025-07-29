class AddIndexOnParentIdToContainers < ActiveRecord::Migration[6.1]
  def change
    add_index :containers, :parent_id, unique: false, where: "deleted_at IS NULL"
  rescue StandardError => e
    Rails.logger.error "An error occurred while adding the index: #{e.message}"
  end
end
