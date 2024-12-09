class MatriceComment < ActiveRecord::Migration[6.1]
  def up
    Matrice.create(
      name: 'commentActivation',
      enabled: false,
      label: 'commentActivation',
      include_ids: [],
      exclude_ids: [],
      configs: {}
    ) unless Matrice.find_by(name: 'commentActivation')
  end

  def down
    Matrice.find_by(name: 'commentActivation')&.really_destroy!
  end
end
