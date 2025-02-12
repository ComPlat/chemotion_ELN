class InitSbmmCountersAndProfileDefinition < ActiveRecord::Migration[6.1]
  def up
    upgrade_counter_definition

    User.all.find_each do |user|
      user.counters['sequence_based_macromolecules'] = "0"
      user.update_column(:counters, user.counters)
    end

    Profile.all.find_each do |profile|
      next unless profile.data['layout']
      next if profile.data['layout']['sequence_based_macromolecule']

      profile.data['layout']['sequence_based_macromolecule'] = -1200
      profile.save
    end
  end

  def down
    User.all.find_each do |user|
      user.counters.delete('sequence_based_macromolecules')
      user.update_column(:counters, user.counters)
    end

    Profile.all.find_each do |profile|
      next unless profile.data['layout']
      next unless profile.data['layout']['sequence_based_macromolecule']

      profile.data['layout'].delete('sequence_based_macromolecule')
      profile.save
    end

    downgrade_counter_definition
  end

  private

  # NOTE: actually the old defaults were only samples, reactions and wellplates, because the other features didn't update
  # the counter defaults, but I prefer having the default in sync with the intended state
  def downgrade_counter_definition
    old_defaults = {
      celllines: 0,
      device_descriptions: 0,
      samples: 0,
      reactions: 0,
      wellplates: 0
    }
    change_column :users, :counters, :hstore, null: false, default: old_defaults
  end

  def upgrade_counter_definition
    new_defaults = {
      celllines: 0,
      device_descriptions: 0,
      samples: 0,
      sequence_based_macromolecules: 0,
      reactions: 0,
      wellplates: 0
    }
    change_column :users, :counters, :hstore, null: false, default: new_defaults
  end
end
