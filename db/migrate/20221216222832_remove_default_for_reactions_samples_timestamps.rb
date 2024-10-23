class RemoveDefaultForReactionsSamplesTimestamps < ActiveRecord::Migration[6.1]
  def change
    change_column_default(:reactions_samples, :created_at, from: '2021-10-1T00:00:00', to: nil)
    change_column_default(:reactions_samples, :updated_at, from: '2021-10-1T00:00:00', to: nil)
  end
end
