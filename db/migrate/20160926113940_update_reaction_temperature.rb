class UpdateReactionTemperature < ActiveRecord::Migration[4.2]
  def change
    add_column :reactions, :tmp, :string, default: ''
    Reaction.reset_column_information
    Reaction.update_all("tmp = temperature")
    Reaction.update_all("temperature = NULL")

    d = {
      "valueUnit" => "°C",
      "userText" => "",
      "data" => []
    }.to_s
    change_column :reactions, :temperature, :text, default: d
    Reaction.reset_column_information

    Reaction.find_each do |r|
      temperature_data = {
        "valueUnit" => "°C",
        "userText" => "",
        "data" => []
      }
      old_temperature = r.tmp == nil ? 21 : r.tmp[/(\d+[,.]\d+)/, 1]

      if old_temperature != nil
        data = {
          "time" => "00:00:00",
          "value" => old_temperature
        }
        temperature_data["data"].push(data)
      end

      r.temperature = temperature_data
      r.save!
    end

    remove_column :reactions, :tmp
  end
end
