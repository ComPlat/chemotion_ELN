class AddTimestampsToReactionsSamples < ActiveRecord::Migration[5.2]
  def change
    change_table :reactions_samples do |t|
      t.timestamps null: false, default: '2021-10-1T00:00:00'
    end
  end
end
