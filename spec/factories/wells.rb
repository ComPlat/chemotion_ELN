FactoryBot.define do
  factory :well do
    position_x { 0 }
    position_y { 0 }
    wellplate
    readouts do
      [
        {
          value: '98.34',
          unit: '%'
        },
        {
          value: '50',
          unit: 'µM'
        }
      ]
    end
  end
end
