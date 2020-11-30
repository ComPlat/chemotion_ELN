class MatriceReactionPrediction < ActiveRecord::Migration[4.2]
  class Matrice < ActiveRecord::Base
  end

  def change
    name =  { name: 'reactionPrediction' }
    Matrice.find_or_create_by(name)&.update(
      enabled: false,
      label: 'reactionPrediction',
      include_ids: [],
      exclude_ids: [],
      configs: {
        url: '',
        port: ''
      }
    )
  end
end
