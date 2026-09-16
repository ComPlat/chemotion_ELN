class InitVesselProfileDefinition < ActiveRecord::Migration[6.1]
  def up
    Profile.all.find_each do |profile|
      next unless profile.data['layout']
      next if profile.data['layout']['vessel']

      profile.data['layout']['vessel'] = -1300
      profile.save
    end
  end

  def down
    Profile.all.find_each do |profile|
      next unless profile.data['layout']
      next unless profile.data['layout']['vessel']

      profile.data['layout'].delete('vessel')
      profile.save
    end
  end
end
