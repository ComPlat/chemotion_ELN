class MatriceGenericElement < ActiveRecord::Migration
  def change
    Matrice.create(
      name: 'genericElement',
      enabled: false,
      label: 'genericElement',
      include_ids: [],
      exclude_ids: []
    )
  end
end
