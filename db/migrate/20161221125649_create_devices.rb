class CreateDevices < ActiveRecord::Migration[4.2]
  def change
    create_table :devices do |t|
      t.string :code, default: ""
      t.string :types, array: true, default: []
    end
  end
end
