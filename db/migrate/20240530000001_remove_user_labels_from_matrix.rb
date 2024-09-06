class RemoveUserLabelsFromMatrix < ActiveRecord::Migration[6.1]
  def change
    Matrice.find_by(name: 'userLabel')&.destroy!
  rescue StandardError => e
    Rails.logger.error "Error changing channel msg: #{e.message}"
  end
end
