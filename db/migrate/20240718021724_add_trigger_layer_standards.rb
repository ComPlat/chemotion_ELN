class AddTriggerLayerStandards < ActiveRecord::Migration[6.1]
  def change
    if table_exists? :layers
      create_trigger :lab_trg_layers_changes, on: :layers
    end
  end
end
