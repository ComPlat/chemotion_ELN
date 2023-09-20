class LabimotionClass < ActiveRecord::Migration[6.1]
  def change
    Container.where(containable_type: 'Element').find_each { |c| c.update_column(:containable_type, 'Labimotion::Element') }
    ElementTag.where(taggable_type: 'Element').find_each { |c| c.update_column(:taggable_type, 'Labimotion::Element') }
  end
end
