class CreateDevices < ActiveRecord::Migration
  def change
    create_table :devices do |t|
      t.string :code, default: ""
      t.string :types, array: true, default: []
    end
  end
end
