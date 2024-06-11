# frozen_string_literal: true

Medium::MediumSample.find_or_create_by(sample_name: 'Oxygen', molecule_name: 'Molecular Oxygen', sum_formula: 'O2')
Medium::MediumSample.find_or_create_by(sample_name: 'Nitrogen', molecule_name: 'Molecular Nitrogen', sum_formula: 'N2')
Medium::MediumSample.find_or_create_by(sample_name: 'Hydrogen', molecule_name: '', sum_formula: 'H2')
Medium::MediumSample.find_or_create_by(sample_name: 'Carbon Dioxide', molecule_name: '', sum_formula: 'CO2')

Medium::Additive.find_or_create_by(sample_name: 'Brine', molecule_name: 'sodium;chloride')
Medium::Additive.find_or_create_by(molecule_name: 'dipotassium;sulfate').update(sample_name: 'dipotassium;sulfate')
Medium::Additive.find_or_create_by(sample_name: 'Silica Gel', molecule_name: '')
Medium::Additive.find_or_create_by(molecule_name: 'disodium;sulfate').update(sample_name: 'disodium;sulfate')
Medium::Additive.find_or_create_by(sample_name: 'Celite', molecule_name: '')
Medium::Additive.find_or_create_by(sample_name: 'sat. NaHCO3 solution', molecule_name: '')
Medium::Additive.find_or_create_by(sample_name: 'sat. NH4Cl solution', molecule_name: '')
Medium::Additive.find_or_create_by(sample_name: 'Sodium sulfate (Na2SO4)', molecule_name: '')
Medium::Additive.find_or_create_by(sample_name: 'Magnesium sulfate (MgSO4)', molecule_name: '')
Medium::Additive.find_or_create_by(sample_name: 'Activated charcoal', molecule_name: '')
Medium::Additive.find_or_create_by(sample_name: 'Molecular sieves', molecule_name: '')

[{
  label: 'Acetic acid',
  value: 'Acetic acid',
}, {
  label: 'Acetone',
  value: 'Acetone',
}, {
  label: 'Acetonitrile',
  value: 'Acetonitrile',
}, {
  label: 'Benzene',
  value: 'Benzene',
}, {
  label: 'Butanol',
  value: 'Butanol',
}, {
  label: 'Carbon tetrachloride (CCl4)',
  value: 'Carbon tetrachloride',
}, {
  label: 'Chloroform',
  value: 'Chloroform',
}, {
  label: 'Cyclohexane',
  value: 'Cyclohexane',
}, {
  label: 'Diethyl ether',
  value: 'Diethyl ether',
}, {
  label: 'Dimethyl sulfoxide (DMSO)',
  value: 'Dimethyl sulfoxide',
}, {
  label: 'Dimethylformamide (DMF)',
  value: 'Dimethylformamide',
}, {
  label: '1,4-Dioxane',
  value: '1,4-Dioxane',
}, {
  label: 'Ethanol',
  value: 'Ethanol',
}, {
  label: 'Ethyl acetate',
  value: 'Ethyl acetate',
}, {
  label: 'Formic acid',
  value: 'Formic acid',
}, {
  label: 'Isopropanol',
  value: 'Isopropanol',
}, {
  label: 'Methanol',
  value: 'Methanol',
}, {
  label: 'Methylene chloride (DCM)',
  value: 'Methylene chloride',
}, {
  label: 'Methyl tert-butyl ether (MTBE)',
  value: 'Methyl tert-butyl ether',
}, {
  label: 'n-Hexane',
  value: 'n-Hexane',
}, {
  label: 'N-Methyl-2-pyrrolidone (NMP)',
  value: 'N-Methyl-2-pyrrolidone',
}, {
  label: 'Pentane',
  value: 'Pentane',
}, {
  label: 'Pyridine',
  value: 'Pyridine',
}, {
  label: 'Tetrahydrofuran (THF)',
  value: 'Tetrahydrofuran',
}, {
  label: 'Trifluoroacetic acid (TFA)',
  value: 'Trifluoroacetic acid',
}, {
  label: 'Toluene',
  value: 'Toluene',
}, {
  label: 'Water',
  value: 'Water',
}, {
  label: 'CDCl3',
  value: 'CDCl3',
}, {
  label: 'MeOD-d4',
  value: 'MeOD-d4',
}, {
  label: 'C6D6',
  value: 'C6D6',
}, {
  label: 'D2O',
  value: 'D2O',
}].each { |solvent| Medium::DiverseSolvent.find_or_create_by(sample_name: solvent[:label]) }


['Formic Acid (FA)',
'Trifluoroacetic Acid (TFA)',
'Potassium Dihydrogen Orthophosphate',
'Potassium Hydrogen Phthalate',
'Potassium Phosphate Dibasic',
'Sodium Acetate',
'Ammonium Dihydrogen Phosphate',
'Ammonium Formate'].each { |name| Medium::Modifier.find_or_create_by(sample_name: name)}
