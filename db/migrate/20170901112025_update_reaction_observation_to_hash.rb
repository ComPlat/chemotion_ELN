class UpdateReactionObservationToHash < ActiveRecord::Migration
  class Reaction < ActiveRecord::Base
    serialize :observation
  end

  def up
    Reaction.find_each do |r|
      obs_hash = {
        'ops' => [
          { 'insert' => r.observation }
        ]
      }
      r.update_column(:observation, obs_hash)
    end

    Reaction.reset_column_information
  end

  def down
    Reaction.find_each do |r|
      obs = r.observation.dig('ops').map { |x| x.dig('insert') }.join(' ')
      r.update_column(:observation, obs)
    end

    Reaction.reset_column_information
  end
end
