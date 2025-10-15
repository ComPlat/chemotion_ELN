class UpdateKetcherEditorFeat < ActiveRecord::Migration[6.1]
  def change
    m = Matrice.find_by(name: 'ketcher2Editor')
    return if m.nil?

    if m.configs.blank? || m.configs['editor'] == 'ketcher2'
      m.update_columns(name: 'ketcherEditor', label: 'ketcherEditor', enabled: true, configs: { editor: 'ketcher' })
    end
  rescue StandardError => e
    Rails.logger.error("Error updating editor feature: #{e.message}")
  end
end
