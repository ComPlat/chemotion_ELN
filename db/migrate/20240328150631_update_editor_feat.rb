class UpdateEditorFeat < ActiveRecord::Migration[6.1]
  def change
    m = Matrice.find_by(name: 'ketcher2Editor')
    # update the feature config unless it is already set
    m && m.configs&.fetch('editor', nil).blank? && m.update_columns(configs: { editor: 'ketcher2' })
  rescue StandardError => e
    Rails.logger.error "Error updating editor feature: #{e.message}"
  end
end
