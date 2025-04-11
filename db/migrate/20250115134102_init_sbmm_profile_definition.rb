class InitSbmmProfileDefinition < ActiveRecord::Migration[6.1]
  def up
    Profile.all.find_each do |profile|
      next unless profile.data['layout']
      next if profile.data['layout']['sequence_based_macromolecule_sample']

      profile.data['layout']['sequence_based_macromolecule_sample'] = -1200
      profile.save
    end
  end

  def down
    Profile.all.find_each do |profile|
      next unless profile.data['layout']
      next unless profile.data['layout']['sequence_based_macromolecule_sample']

      profile.data['layout'].delete('sequence_based_macromolecule_sample')
      profile.save
    end
  end
end
