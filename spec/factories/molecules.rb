FactoryGirl.define do
  factory :molecule do
    inchikey          "inchikey"
    inchistring       "inchistring"
    density           0.12345
    molecular_weight  0.54321
    molfile           ""
    melting_point     150.00
    boiling_point     100.00
    sum_formular      "sum_formular"
    names             %w(name1 name2 name3)
    iupac_name        "iupac_name"
    molecule_svg_file "molecule_svg_file"
  end
end
