

FactoryGirl.define do
  factory :molecule do
    inchikey          "inchikey"
    inchistring       "inchistring"
    density           0.12345
    molecular_weight  0.54321
    #molfile           "\n  Ketcher 05301616272D 1   1.00000     0.00000     0\n\n  2  1  0     0  0            999 V2000\n    1.0000    0.0000    0.0000 C   0  0  0  0  0  0  0  0  0  0  0  0\n    0.0000    0.0000    0.0000 C   0  0  0  0  0  0  0  0  0  0  0  0\n  1  2  1  0     0  0\nM  END\n"
    molfile           <<-MOLFILE
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
    melting_point     150.00
    boiling_point     100.00
    sum_formular      "sum_formular"
    names             %w(name1 name2 name3)
    iupac_name        "iupac_name"
    molecule_svg_file "molecule_svg_file"
  end
end
