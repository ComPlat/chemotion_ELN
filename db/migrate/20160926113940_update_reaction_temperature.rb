class UpdateReactionTemperature < ActiveRecord::Migration
  def change
    d = {
      "valueUnit" => "C",
      "data" => [
        {"time" => "00:00:00", "value" => 21}
      ]
    }
    add_column :reactions, :temperature_raw, :string, default: ''
    Reaction.reset_column_information

    Reaction.update_all("temperature_raw = temperature")
    Reaction.update_all("temperature = NULL")
    Reaction.reset_column_information

    change_column :reactions, :temperature, :text, default: d
    Reaction.reset_column_information

    Reaction.find_each do |r|
      old_temperature = if r.temperature_raw == nil
                          21
                        else
                          r.temperature_raw[/(\d+[,.]\d+)/, 1]
                        end

      temperature_data = d
      temperature_data = {
        "timeUnit" => "s",
        "valueUnit" => "C",
        "data" => [
          {"time" => "00:00:00", "value" => old_temperature}
        ]
      } if old_temperature != nil

      r.temperature = temperature_data
      r.save!
    end

    remove_column :reactions, :temperature_raw
  end
end
