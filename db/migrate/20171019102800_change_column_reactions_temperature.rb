# Migration to change column type of reactions.temperature from
# type text (rails hash serialized) to postgres jsonb (and down)
class ChangeColumnReactionsTemperature < ActiveRecord::Migration
  def up
    Reaction.with_deleted.find_each do |r|
      tmp = r.temperature
      tmp = "---\nvalueUnit: \"°C\"\nuserText: ''\ndata: []\n" if tmp.empty?
      t = if tmp.is_a?(String)
            YAML.load(tmp).to_json
          elsif tmp.is_a?(Hash)
            tmp.to_json
          end
      r.update_column(:temperature, t)
    end
    Reaction.reset_column_information
    change_column_default :reactions, :temperature, nil
    change_column(
      :reactions, :temperature,
      'jsonb USING CAST(temperature as json)'
    )
    change_column_default(
      :reactions, :temperature,
      '{"valueUnit": "°C","userText": "", "data": []}'
    )
  end

  def down
    change_column_default :reactions, :temperature, nil
    change_column(
      :reactions, :temperature, 'text USING CAST(temperature AS text)'
    )
    Reaction.with_deleted.find_each do |r|
      tmp = r.temperature
      tmp = '{"valueUnit": "°C","userText": "", "data": []}' if tmp.empty?
      tmp = JSON.parse(tmp) if tmp.is_a?(String)
      t = Hashie::Mash.new(tmp).to_yaml
      r.update_column(:temperature, t)
    end
    change_column_default(
      :reactions, :temperature,
      "---\nvalueUnit: \"°C\"\nuserText: ''\ndata: []\n"
    )
  end
end
