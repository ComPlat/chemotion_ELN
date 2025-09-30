class AddIndexOnAncestryToSamples < ActiveRecord::Migration[6.1]
  def change
    add_index :samples, :ancestry, unique: false, where: "deleted_at IS NULL"
  rescue StandardError => e
    Rails.logger.error "An error occurred while adding index on ancestry: #{e.message}"
  end
end
