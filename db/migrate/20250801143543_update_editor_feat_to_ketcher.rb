class UpdateEditorFeatToKetcher < ActiveRecord::Migration[6.1]
  def change
    m = Matrice.find_by(name: 'ketcher2Editor')
    m.update_columns(configs: { editor: 'ketcher' })
  rescue StandardError => e
    Rails.logger.error "Error updating editor feature to ketcher: #{e.message}"
  end
end
