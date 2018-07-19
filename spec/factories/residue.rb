FactoryBot.define do
  factory :residue do
    residue_type "polymer"
    custom_info({
                  "formula"=>"CH",
                  "loading"=>"2",
                  "loading_type"=>"mass",
                  "polymer_type"=>"polystyrene",
                  "external_loading"=>"2"
                })
  end
end
