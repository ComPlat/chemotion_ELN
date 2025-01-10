class AddFnLayerStandardHistory < ActiveRecord::Migration[6.1]
  def change
    create_function :lab_record_layers_changes
  end
end
