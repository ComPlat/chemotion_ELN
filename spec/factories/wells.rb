FactoryBot.define do
  factory :well do
    position_x { 0 }
    position_y { 0 }
    wellplate
    readouts do
      [
        {
          title: 'Activity',
          value: '98.34',
          unit: '%'
        },
        {
          title: 'Compound Concentration',
          value: '50',
          unit: 'µM'
        }
      ]
    end
  end
end
