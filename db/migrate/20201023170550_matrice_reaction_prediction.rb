class MatriceReactionPrediction < ActiveRecord::Migration
  def change
    name =  { name: 'reactionPrediction' }
    Matrice.find_or_create_by(name)&.update(
      enabled: false,
      label: 'reactionPrediction',
      include_ids: [],
      exclude_ids: [],
      configs: {
        url: '127.0.0.1',
        port: '5001'
      }
    )
  end
end
