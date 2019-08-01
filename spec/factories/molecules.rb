FactoryBot.define do
  factory :molecule do
    sequence(:inchikey) { |i| "XLYOFNOQVPJJNP-UHFFFAOYSA-#{i}" }
    inchistring       { "inchistring" }
    density           { 0.12345 }
    molecular_weight  { 18.0153 }
    exact_molecular_weight { 18.0106 }
    molfile           { <<-MOLFILE }
H2O Water 7732185
##CCCBDB 8251509:58
Geometry Optimized at HF/STO-3G
  3  2  0  0  0  0  0  0  0  0    V2000
    0.0000    0.0000    0.1271 O  0000000000000000000
    0.0000    0.7580   -0.5085 H  0000000000000000000
    0.0000   -0.7580   -0.5085 H  0000000000000000000
  1  2  1  0     0  0
  1  3  1  0     0  0
M  END
MOLFILE
    melting_point     { 150.00 }
    boiling_point     { 100.00 }
    sum_formular      { "H2O" }
    names             { %w(name1  sum_formular iupac_name) }
    iupac_name        { "iupac_name" }
    molecule_svg_file { "molecule.svg" }
  end
end
