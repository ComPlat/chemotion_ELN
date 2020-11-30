class UpdateSampleAnalysesDumpContentToHash < ActiveRecord::Migration[4.2]
  def up
    Sample.find_each do |s|
      analyses = s.analyses.map do |a|
        a["content"] = {
          "ops" => [
            { "insert" => a["content"] }
          ]
        }
        a
      end
      json_dump = JSON.dump(analyses)
      s.update_column(:analyses_dump, json_dump)
    end
  end

  def down
    Sample.find_each do |s|
      analyses = s.analyses.map do |a|
        a["content"] = a["content"]["ops"] ? a["content"]["ops"][0]["insert"] : ""
        a
      end
      json_dump = JSON.dump(analyses)
      s.update_column(:analyses_dump, json_dump)
    end
  end
end
