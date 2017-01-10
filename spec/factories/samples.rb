FactoryGirl.define do
  factory :sample do

    sequence(:name) { |i| "Sample #{i}" }

    target_amount_value 100
    target_amount_unit "mg"
    analyses [
      {
        "id"=>"da636f30-9446-11e6-b196-8d770ab69c12",
        "type"=>"analysis",
        "name"=>"1234121",
        "kind"=>"13C NMR",
        "status"=>"Confirmed",
        "content"=>{ "ops": [{ "insert": "" }] },
        "description"=>"",
        "datasets"=>[]
        }
      ]
  #  molfile "\n  Ketcher 05301616272D 1   1.00000     0.00000     0\n\n  2  1  0     0  0            999 V2000\n    1.0000    0.0000    0.0000 C   0  0  0  0  0  0  0  0  0  0  0  0\n    0.0000    0.0000    0.0000 C   0  0  0  0  0  0  0  0  0  0  0  0\n  1  2  1  0     0  0\nM  END\n"
    callback(:before_create) do |sample|
      sample.creator = FactoryGirl.build(:user) unless sample.creator
      sample.collections << FactoryGirl.build(:collection) #if sample.collections.blank?
      sample.molecule = FactoryGirl.build(:molecule) unless sample.molecule
    end
  end
end
