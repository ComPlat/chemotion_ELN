export const solventOptions = [{
    label: 'Acetic acid',
    value: 'Acetic acid'
  }, {
    label: 'Acetone',
    value: 'Acetone'
  }, {
    label: 'Acetonitrile',
    value: 'Acetonitrile'
  }, {
    label: 'Benzene',
    value: 'Benzene'
  }, {
    label: 'Butanol',
    value: 'Butanol'
  }, {
    label: 'Carbon tetrachloride (CCl4)',
    value: 'Carbon tetrachloride'
  }, {
    label: 'Chloroform',
    value: 'Chloroform'
  }, {
    label: 'Cyclohexane',
    value: 'Cyclohexane'
  }, {
    label: 'Diethyl ether',
    value: 'Diethyl ether'
  }, {
    label: 'Dimethyl sulfoxide (DMSO)',
    value: 'Dimethyl sulfoxide'
  }, {
    label: 'Dimethylformamide (DMF)',
    value: 'Dimethylformamide'
  }, {
    label: '1,4-Dioxane',
    value: '1,4-Dioxane'
  }, {
    label: 'Ethanol',
    value: 'Ethanol'
  }, {
    label: 'Ethyl acetate',
    value: 'Ethyl acetate'
  }, {
    label: 'Isopropanol',
    value: 'Isopropanol'
  }, {
    label: 'Methanol',
    value: 'Methanol'
  }, {
    label: 'Methylene chloride (DCM)',
    value: 'Methylene chloride'
  }, {
    label: 'Methyl tert-butyl ether (MTBE)',
    value: 'Methyl tert-butyl ether'
  }, {
    label: 'n-Hexane',
    value: 'n-Hexane'
  }, {
    label: 'N-Methyl-2-pyrrolidone (NMP)',
    value: 'N-Methyl-2-pyrrolidone'
  }, {
    label: 'Pentane',
    value: 'Pentane'
  }, {
    label: 'Pyridine',
    value: 'Pyridine'
  }, {
    label: 'Tetrahydrofuran (THF)',
    value: 'Tetrahydrofuran'
  }, {
    label: 'Toluene',
    value: 'Toluene'
  }, {
    label: 'Water',
    value: 'Water'
  }, {
    label: 'CDCl3',
    value: 'CDCl3'
  }, {
    label: 'MeOD-d4',
    value: 'MeOD-d4'
  }, {
    label: 'C6D6',
    value: 'C6D6'
  }, {
    label: 'D2O',
    value: 'D2O'
  }];

export const defaultMultiSolventsOptions = [{
    label: 'Acetic acid',
    value: { external_label: 'Acetic acid',
             molfile: '\n  Ketcher 09281617382D 1   1.00000     0.00000     0\n\n  4  3  0     0  0            999 V2000\n    4.7672    0.9580    0.0000 O   0  0  0  0  0  0  0  0  0  0  0  0\n    3.6610   -0.9580    0.0000 O   0  0  0  0  0  0  0  0  0  0  0  0\n    2.5548    0.9580    0.0000 C   0  0  0  0  0  0  0  0  0  0  0  0\n    3.6610    0.3193    0.0000 C   0  0  0  0  0  0  0  0  0  0  0  0\n  1  4  1  0     0  0\n  2  4  2  0     0  0\n  3  4  1  0     0  0\nM  END\n',
             density: 1.05 }
  }, {
    label: 'Acetone',
    value: { external_label: 'Acetone',
             molfile: '\n  -ISIS-  04181617412D\n\n  4  3  0  0  0  0  0  0  0  0999 V2000\n   -0.5333   -0.4500    0.0000 O   0  0  0  0  0  0  0  0  0  0  0  0\n   -0.5333    0.3750    0.0000 C   0  0  0  0  0  0  0  0  0  0  0  0\n   -1.2458    0.7875    0.0000 C   0  0  0  0  0  0  0  0  0  0  0  0\n    0.1792    0.7875    0.0000 C   0  0  0  0  0  0  0  0  0  0  0  0\n  2  1  2  0  0  0  0\n  3  2  1  0  0  0  0\n  4  2  1  0  0  0  0\nM  END',
             density: 0.79 }
  }, {
    label: 'Acetonitrile',
    value: { external_label: 'Acetonitrile',
             molfile: '\n  -OEChem-09281610132D\n\n  6  5  0     0  0  0  0  0  0999 V2000\n    3.7320    0.5000    0.0000 N   0  0  0  0  0  0  0  0  0  0  0  0\n    2.0000   -0.5000    0.0000 C   0  0  0  0  0  0  0  0  0  0  0  0\n    2.8660    0.0000    0.0000 C   0  0  0  0  0  0  0  0  0  0  0  0\n    1.6900    0.0369    0.0000 H   0  0  0  0  0  0  0  0  0  0  0  0\n    1.4631   -0.8100    0.0000 H   0  0  0  0  0  0  0  0  0  0  0  0\n    2.3100   -1.0369    0.0000 H   0  0  0  0  0  0  0  0  0  0  0  0\n  1  3  3  0  0  0  0\n  2  3  1  0  0  0  0\n  2  4  1  0  0  0  0\n  2  5  1  0  0  0  0\n  2  6  1  0  0  0  0\nM  END\n',
             density: 0.78 }
  }, {
    label: 'Benzene',
    value: { external_label: 'Benzene',
             molfile: '\n  Ketcher 09281617252D 1   1.00000     0.00000     0\n\n  6  6  0     0  0            999 V2000\n    3.5383    1.2346    0.0000 C   0  0  0  0  0  0  0  0  0  0  0  0\n    2.4691    0.6173    0.0000 C   0  0  0  0  0  0  0  0  0  0  0  0\n    4.6074    0.6173    0.0000 C   0  0  0  0  0  0  0  0  0  0  0  0\n    2.4691   -0.6173    0.0000 C   0  0  0  0  0  0  0  0  0  0  0  0\n    4.6074   -0.6173    0.0000 C   0  0  0  0  0  0  0  0  0  0  0  0\n    3.5383   -1.2346    0.0000 C   0  0  0  0  0  0  0  0  0  0  0  0\n  1  2  2  0     0  0\n  1  3  1  0     0  0\n  2  4  1  0     0  0\n  3  5  2  0     0  0\n  4  6  2  0     0  0\n  5  6  1  0     0  0\nM  END\n',
             density: 0.88 }
  }, {
    label: 'Butanol',
    value: { external_label: 'Butanol',
             molfile: '\n  Ketcher 09281616592D 1   1.00000     0.00000     0\n\n  5  4  0     0  0            999 V2000\n    3.0000    0.0000    0.0000 O   0  0  0  0  0  0  0  0  0  0  0  0\n    1.5000    0.8660    0.0000 C   0  0  0  0  0  0  0  0  0  0  0  0\n    1.0000    0.0000    0.0000 C   0  0  0  0  0  0  0  0  0  0  0  0\n    2.5000    0.8660    0.0000 C   0  0  0  0  0  0  0  0  0  0  0  0\n    0.0000    0.0000    0.0000 C   0  0  0  0  0  0  0  0  0  0  0  0\n  1  4  1  0     0  0\n  2  3  1  0     0  0\n  2  4  1  0     0  0\n  3  5  1  0     0  0\nM  END\n',
             density: 0.81 }
  }, {
    label: 'Carbon tetrachloride (CCl4)',
    value: { external_label: 'CCl4',
             molfile: '\n  Ketcher 10101611292D 1   1.00000     0.00000     0\n\n  5  4  0     0  0            999 V2000\n    3.7321    0.5000    0.0000 Cl  0  0  0  0  0  0  0  0  0  0  0  0\n    2.0000   -0.5000    0.0000 Cl  0  0  0  0  0  0  0  0  0  0  0  0\n    2.3661    0.8660    0.0000 Cl  0  0  0  0  0  0  0  0  0  0  0  0\n    3.3661   -0.8660    0.0000 Cl  0  0  0  0  0  0  0  0  0  0  0  0\n    2.8661    0.0000    0.0000 C   0  0  0  0  0  0  0  0  0  0  0  0\n  1  5  1  0     0  0\n  2  5  1  0     0  0\n  3  5  1  0     0  0\n  4  5  1  0     0  0\nM  END\n',
             density: 1.594 }
  }, {
    label: 'Chloroform',
    value: { external_label: 'Chloroform',
             molfile: '\n  -OEChem-09281610262D\n\n  5  4  0     0  0  0  0  0  0999 V2000\n    3.7320    0.7500    0.0000 Cl  0  0  0  0  0  0  0  0  0  0  0  0\n    2.0000    0.7500    0.0000 Cl  0  0  0  0  0  0  0  0  0  0  0  0\n    2.8660   -0.7500    0.0000 Cl  0  0  0  0  0  0  0  0  0  0  0  0\n    2.8660    0.2500    0.0000 C   0  0  0  0  0  0  0  0  0  0  0  0\n    2.8660    0.8700    0.0000 H   0  0  0  0  0  0  0  0  0  0  0  0\n  1  4  1  0  0  0  0\n  2  4  1  0  0  0  0\n  3  4  1  0  0  0  0\n  4  5  1  0  0  0  0\nM  END\n',
             density: 1.48 }
  }, {
    label: 'Cyclohexane',
    value: { external_label: 'Cyclohexane',
             molfile: '\n  Ketcher 09281617282D 1   1.00000     0.00000     0\n\n  6  6  0     0  0            999 V2000\n    3.8383    1.3393    0.0000 C   0  0  0  0  0  0  0  0  0  0  0  0\n    2.6785    0.6696    0.0000 C   0  0  0  0  0  0  0  0  0  0  0  0\n    4.9981    0.6696    0.0000 C   0  0  0  0  0  0  0  0  0  0  0  0\n    4.9981   -0.6696    0.0000 C   0  0  0  0  0  0  0  0  0  0  0  0\n    2.6785   -0.6696    0.0000 C   0  0  0  0  0  0  0  0  0  0  0  0\n    3.8383   -1.3393    0.0000 C   0  0  0  0  0  0  0  0  0  0  0  0\n  1  2  1  0     0  0\n  1  3  1  0     0  0\n  2  5  1  0     0  0\n  3  4  1  0     0  0\n  4  6  1  0     0  0\n  5  6  1  0     0  0\nM  END\n',
             density: 0.78 }
  }, {
    label: 'Diethyl ether',
    value: { external_label: 'Diethyl ether',
             molfile: '\n  Ketcher 09281617292D 1   1.00000     0.00000     0\n\n  5  4  0     0  0            999 V2000\n    5.1225   -0.3431    0.0000 O   0  0  0  0  0  0  0  0  0  0  0  0\n    6.3113    0.3431    0.0000 C   0  0  0  0  0  0  0  0  0  0  0  0\n    3.9339    0.3431    0.0000 C   0  0  0  0  0  0  0  0  0  0  0  0\n    7.5000   -0.3431    0.0000 C   0  0  0  0  0  0  0  0  0  0  0  0\n    2.7452   -0.3431    0.0000 C   0  0  0  0  0  0  0  0  0  0  0  0\n  1  2  1  0     0  0\n  1  3  1  0     0  0\n  2  4  1  0     0  0\n  3  5  1  0     0  0\nM  END\n',
             density: 0.71 }
  }, {
    label: 'Dimethyl sulfoxide (DMSO)',
    value: { external_label: 'DMSO',
             molfile: '\n  Ketcher 09281617312D 1   1.00000     0.00000     0\n\n  4  3  0     0  0            999 V2000\n    3.8385    0.3348    0.0000 S   0  0  0  0  0  0  0  0  0  0  0  0\n    4.9983    1.0045    0.0000 O   0  0  0  0  0  0  0  0  0  0  0  0\n    2.6786    1.0045    0.0000 C   0  0  0  0  0  0  0  0  0  0  0  0\n    3.8385   -1.0045    0.0000 C   0  0  0  0  0  0  0  0  0  0  0  0\n  1  2  2  0     0  0\n  1  3  1  0     0  0\n  1  4  1  0     0  0\nM  END\n',
             density: 1.10 }
  }, {
    label: 'Dimethylformamide (DMF)',
    value: { external_label: 'DMF',
             molfile: '\n  Ketcher 09281617332D 1   1.00000     0.00000     0\n\n  5  4  0     0  0            999 V2000\n    6.0647   -0.0791    0.0000 O   0  0  0  0  0  0  0  0  0  0  0  0\n    3.7801   -0.0791    0.0000 N   0  0  0  0  0  0  0  0  0  0  0  0\n    2.6379    0.5803    0.0000 C   0  0  0  0  0  0  0  0  0  0  0  0\n    3.7801   -1.3981    0.0000 C   0  0  0  0  0  0  0  0  0  0  0  0\n    4.9223    0.5803    0.0000 C   0  0  0  0  0  0  0  0  0  0  0  0\n  1  5  2  0     0  0\n  2  3  1  0     0  0\n  2  4  1  0     0  0\n  2  5  1  0     0  0\nM  END\n',
             density: 0.95 }
  }, {
    label: '1,4-Dioxane',
    value: { external_label: '1,4-Dioxane',
             molfile: '\n  Ketcher 09281617362D 1   1.00000     0.00000     0\n\n  6  6  0     0  0            999 V2000\n    3.6610   -1.2774    0.0000 O   0  0  0  0  0  0  0  0  0  0  0  0\n    3.6610    1.2774    0.0000 O   0  0  0  0  0  0  0  0  0  0  0  0\n    2.5548    0.6387    0.0000 C   0  0  0  0  0  0  0  0  0  0  0  0\n    2.5548   -0.6387    0.0000 C   0  0  0  0  0  0  0  0  0  0  0  0\n    4.7672    0.6387    0.0000 C   0  0  0  0  0  0  0  0  0  0  0  0\n    4.7672   -0.6387    0.0000 C   0  0  0  0  0  0  0  0  0  0  0  0\n  1  4  1  0     0  0\n  1  6  1  0     0  0\n  2  3  1  0     0  0\n  2  5  1  0     0  0\n  3  4  1  0     0  0\n  5  6  1  0     0  0\nM  END\n',
             density: 1.03 }
  }, {
    label: 'Ethanol',
    value: { external_label: 'Ethanol',
             molfile: '\n  Ketcher 09281617402D 1   1.00000     0.00000     0\n\n 3  2  0     0  0            999 V2000\n    3.5482   -0.3497    0.0000 O   0  0  0  0  0  0  0  0  0  0  0  0\n    4.7595    0.3497    0.0000 C   0  0  0  0  0  0  0  0  0  0  0  0\n    5.9708   -0.3497    0.0000 C   0  0  0  0  0  0  0  0  0  0  0  0\n  1  2  1  0     0  0\n  2  3  1  0     0  0\nM  END\n',
             density: 0.789 }
  }, {
    label: 'Ethyl acetate',
    value: { external_label: 'Ethyl acetate',
             molfile: '\n Ketcher 09291609242D 1   1.00000     0.00000     0\n\n  8  7  0     0  0            999 V2000\n    0.0000    0.0000    0.0000 O   0  0  0  0  0  0  0  0  0  0  0  0\n   -0.8660    1.5000    0.0000 O   0  0  0  0  0  0  0  0  0  0  0  0\n   -1.7321   -1.0000    0.0000 C   0  0  0  0  0  0  0  0  0  0  0  0\n   -1.7321    0.0000    0.0000 C   0  0  0  0  0  0  0  0  0  0  0  0\n   -2.5981   -1.5000    0.0000 C   0  0  0  0  0  0  0  0  0  0  0  0\n   -0.8660    0.5000    0.0000 C   0  0  0  0  0  0  0  0  0  0  0  0\n    0.8660   -1.5000    0.0000 C   0  0  0  0  0  0  0  0  0  0  0  0\n    0.0000   -1.0000    0.0000 C   0  0  0  0  0  0  0  0  0  0  0  0\n  1  6  1  0     0  0\n  2  6  2  0     0  0\n  3  4  1  0     0  0\n  3  5  1  0     0  0\n  4  6  1  0     0  0\n  7  8  1  0     0  0\n  8  1  1  0     0  0\nM  END\n',
             density: 0.894 }
  }, {
    label: 'Isopropanol',
    value: { external_label: 'Isopropanol',
             molfile: '\n  Ketcher 09281617442D 1   1.00000     0.00000     0\n\n  4  3  0     0  0            999 V2000\n    5.1573    1.0364    0.0000 O   0  0  0  0  0  0  0  0  0  0  0  0\n    3.9606    0.3455    0.0000 C   0  0  0  0  0  0  0  0  0  0  0  0\n    2.7638    1.0364    0.0000 C   0  0  0  0  0  0  0  0  0  0  0  0\n    3.9606   -1.0364    0.0000 C   0  0  0  0  0  0  0  0  0  0  0  0\n  1  2  1  0     0  0\n  2  3  1  0     0  0\n  2  4  1  0     0  0\nM  END\n',
             density: 0.78 }
  }, {
    label: 'Methanol',
    value: { external_label: 'Methanol',
             molfile: '\n  -OEChem-09281611452D\n\n  6  5  0     0  0  0  0  0  0999 V2000\n    2.5369   -0.2500    0.0000 O   0  0  0  0  0  0  0  0  0  0  0  0\n    3.4030    0.2500    0.0000 C   0  0  0  0  0  0  0  0  0  0  0  0\n    3.7130   -0.2869    0.0000 H   0  0  0  0  0  0  0  0  0  0  0  0\n    3.9399    0.5600    0.0000 H   0  0  0  0  0  0  0  0  0  0  0  0\n    3.0930    0.7869    0.0000 H   0  0  0  0  0  0  0  0  0  0  0  0\n    2.0000    0.0600    0.0000 H   0  0  0  0  0  0  0  0  0  0  0  0\n  1  2  1  0  0  0  0\n  1  6  1  0  0  0  0\n  2  3  1  0  0  0  0\n  2  4  1  0  0  0  0\n  2  5  1  0  0  0  0\nM  END\n',
             density: 0.79 }
  }, {
    label: 'Methylene chloride (DCM)',
    value: { external_label: 'DCM',
             molfile: '\n  Ketcher 09281617472D 1   1.00000     0.00000     0\n\n  3  2  0     0  0            999 V2000\n    4.6075    0.3087    0.0000 Cl  0  0  0  0  0  0  0  0  0  0  0  0\n    2.4692    0.3087    0.0000 Cl  0  0  0  0  0  0  0  0  0  0  0  0\n    3.5384   -0.3087    0.0000 C   0  0  0  0  0  0  0  0  0  0  0  0\n  1  3  1  0     0  0\n  2  3  1  0     0  0\nM  END\n',
             density: 1.33 }
  }, {
    label: 'Methyl tert-butyl ether (MTBE)',
    value: { external_label: 'MTBE',
             molfile: '\n  Ketcher 09281617502D 1   1.00000     0.00000     0\n\n  6  5  0     0  0            999 V2000\n    5.1000    0.6833    0.0000 O   0  0  0  0  0  0  0  0  0  0  0  0\n    3.9166    0.0000    0.0000 C   0  0  0  0  0  0  0  0  0  0  0  0\n    2.7331   -0.6833    0.0000 C   0  0  0  0  0  0  0  0  0  0  0  0\n    3.2333    1.1834    0.0000 C   0  0  0  0  0  0  0  0  0  0  0  0\n    4.5999   -1.1834    0.0000 C   0  0  0  0  0  0  0  0  0  0  0  0\n    6.2836    0.0000    0.0000 C   0  0  0  0  0  0  0  0  0  0  0  0\n  1  2  1  0     0  0\n  1  6  1  0     0  0\n  2  3  1  0     0  0\n  2  4  1  0     0  0\n  2  5  1  0     0  0\nM  END\n',
             density: 0.74 }
  }, {
    label: 'n-Hexane',
    value: { external_label: 'n-Hexane',
             molfile: '\n  Ketcher 09291609182D 1   1.00000     0.00000     0\n\n  6  5  0     0  0            999 V2000\n    5.1835   -0.3472    0.0000 C   0  0  0  0  0  0  0  0  0  0  0  0\n    6.3865    0.3472    0.0000 C   0  0  0  0  0  0  0  0  0  0  0  0\n    3.9807    0.3472    0.0000 C   0  0  0  0  0  0  0  0  0  0  0  0\n    7.5893   -0.3472    0.0000 C   0  0  0  0  0  0  0  0  0  0  0  0\n    2.7779   -0.3472    0.0000 C   0  0  0  0  0  0  0  0  0  0  0  0\n    8.7921    0.3472    0.0000 C   0  0  0  0  0  0  0  0  0  0  0  0\n  1  2  1  0     0  0\n  1  3  1  0     0  0\n  2  4  1  0     0  0\n  3  5  1  0     0  0\n  4  6  1  0     0  0\nM  END\n',
             density: 0.66 }
  }, {
    label: 'N-Methyl-2-pyrrolidone (NMP)',
    value: { external_label: 'NMP',
             molfile: '\n  Ketcher 09291609172D 1   1.00000     0.00000     0\n\n  7  7  0     0  0            999 V2000\n    5.8113    0.0118    0.0000 O   0  0  0  0  0  0  0  0  0  0  0  0\n    3.5727   -0.3426    0.0000 N   0  0  0  0  0  0  0  0  0  0  0  0\n    2.9367    1.6145    0.0000 C   0  0  0  0  0  0  0  0  0  0  0  0\n    2.5437    0.4050    0.0000 C   0  0  0  0  0  0  0  0  0  0  0  0\n    4.2086    1.6145    0.0000 C   0  0  0  0  0  0  0  0  0  0  0  0\n    4.6016    0.4050    0.0000 C   0  0  0  0  0  0  0  0  0  0  0  0\n    3.5727   -1.6145    0.0000 C   0  0  0  0  0  0  0  0  0  0  0  0\n  1  6  2  0     0  0\n  2  4  1  0     0  0\n  2  6  1  0     0  0\n  2  7  1  0     0  0\n  3  4  1  0     0  0\n  3  5  1  0     0  0\n  5  6  1  0     0  0\nM  END\n',
             density: 1.03 }
  }, {
    label: 'Pentane',
    value: { external_label: 'Pentane',
             molfile: '\n  Ketcher 09291609142D 1   1.00000     0.00000     0\n\n  5  4  0     0  0            999 V2000\n    5.2198   -0.3497    0.0000 C   0  0  0  0  0  0  0  0  0  0  0  0\n    6.4311    0.3497    0.0000 C   0  0  0  0  0  0  0  0  0  0  0  0\n    4.0085    0.3497    0.0000 C   0  0  0  0  0  0  0  0  0  0  0  0\n    7.6424   -0.3497    0.0000 C   0  0  0  0  0  0  0  0  0  0  0  0\n    2.7973   -0.3497    0.0000 C   0  0  0  0  0  0  0  0  0  0  0  0\n  1  2  1  0     0  0\n  1  3  1  0     0  0\n  2  4  1  0     0  0\n  3  5  1  0     0  0\nM  END\n',
             density: 0.63 }
  }, {
    label: 'Pyridine',
    value: { external_label: 'Pyridine',
             molfile: '\n  Ketcher 09281618242D 1   1.00000     0.00000     0\n\n  6  6  0     0  0            999 V2000\n    3.4644   -1.2088    0.0000 N   0  0  0  0  0  0  0  0  0  0  0  0\n    3.4644    1.2088    0.0000 C   0  0  0  0  0  0  0  0  0  0  0  0\n    2.4176    0.6044    0.0000 C   0  0  0  0  0  0  0  0  0  0  0  0\n    4.5112    0.6044    0.0000 C   0  0  0  0  0  0  0  0  0  0  0  0\n    2.4176   -0.6044    0.0000 C   0  0  0  0  0  0  0  0  0  0  0  0\n    4.5112   -0.6044    0.0000 C   0  0  0  0  0  0  0  0  0  0  0  0\n  1  5  2  0     0  0\n  1  6  1  0     0  0\n  2  3  2  0     0  0\n  2  4  1  0     0  0\n  3  5  1  0     0  0\n  4  6  2  0     0  0\nM  END\n',
             density: 0.98 }
  }, {
    label: 'Tetrahydrofuran (THF)',
    value: { external_label: 'THF',
             molfile: '\n  Ketcher 09281618232D 1   1.00000     0.00000     0\n\n  5  5  0     0  0            999 V2000\n    3.6664   -1.0042    0.0000 O   0  0  0  0  0  0  0  0  0  0  0  0\n    4.3190    1.0042    0.0000 C   0  0  0  0  0  0  0  0  0  0  0  0\n    3.0138    1.0042    0.0000 C   0  0  0  0  0  0  0  0  0  0  0  0\n    4.7223   -0.2370    0.0000 C   0  0  0  0  0  0  0  0  0  0  0  0\n    2.6105   -0.2370    0.0000 C   0  0  0  0  0  0  0  0  0  0  0  0\n  1  4  1  0     0  0\n  1  5  1  0     0  0\n  2  3  1  0     0  0\n  2  4  1  0     0  0\n  3  5  1  0     0  0\nM  END\n',
             density: 0.889 }
  }, {
    label: 'Toluene',
    value: { external_label: 'Toluene',
             molfile: '\n  Ketcher 09281618222D 1   1.00000     0.00000     0\n\n  7  7  0     0  0            999 V2000\n    3.5945    0.6271    0.0000 C   0  0  0  0  0  0  0  0  0  0  0  0\n    2.5084    0.0000    0.0000 C   0  0  0  0  0  0  0  0  0  0  0  0\n    4.6806    0.0000    0.0000 C   0  0  0  0  0  0  0  0  0  0  0  0\n    3.5945    1.8813    0.0000 C   0  0  0  0  0  0  0  0  0  0  0  0\n    2.5084   -1.2542    0.0000 C   0  0  0  0  0  0  0  0  0  0  0  0\n    4.6806   -1.2542    0.0000 C   0  0  0  0  0  0  0  0  0  0  0  0\n    3.5945   -1.8813    0.0000 C   0  0  0  0  0  0  0  0  0  0  0  0\n  1  2  2  0     0  0\n  1  3  1  0     0  0\n  1  4  1  0     0  0\n  2  5  1  0     0  0\n  3  6  2  0     0  0\n  5  7  2  0     0  0\n  6  7  1  0     0  0\nM  END\n',
             density: 0.87 }
  }, {
    label: 'Water',
    value: { external_label: 'Water',
             molfile: '\n  -OEChem-09281612202D\n\n  3  2  0     0  0  0  0  0  0999 V2000\n    2.5369   -0.1550    0.0000 O   0  0  0  0  0  0  0  0  0  0  0  0\n    3.0739    0.1550    0.0000 H   0  0  0  0  0  0  0  0  0  0  0  0\n    2.0000    0.1550    0.0000 H   0  0  0  0  0  0  0  0  0  0  0  0\n  1  2  1  0  0  0  0\n  1  3  1  0  0  0  0\nM  END\n',
             density: 1.00 }
  }, {
    label: 'CDCl3',
    value: { external_label: 'CDCl3',
             molfile: '\n  -OEChem-09281612192D\n\n  5  4  0     0  0  0  0  0  0999 V2000\n    3.7320    0.3355    0.0000 Cl  0  0  0  0  0  0  0  0  0  0  0  0\n    2.0000   -0.6645    0.0000 Cl  0  0  0  0  0  0  0  0  0  0  0  0\n    2.3660    0.7015    0.0000 Cl  0  0  0  0  0  0  0  0  0  0  0  0\n    2.8660   -0.1645    0.0000 C   0  0  0  0  0  0  0  0  0  0  0  0\n    3.1760   -0.7015    0.0000 H   1  0  0  0  0  0  0  0  0  0  0  0\n  1  4  1  0  0  0  0\n  2  4  1  0  0  0  0\n  3  4  1  0  0  0  0\n  4  5  1  0  0  0  0\nM  ISO  1   5   2\nM  END\n',
             density: 1.500 }
  }, {
    label: 'MeOD-d4',
    value: { external_label: 'MeOD-d4',
             molfile: '\n  -OEChem-09281612172D\n\n  6  5  0     0  0  0  0  0  0999 V2000\n    5.0167   -4.6792    0.0000 O   0  0  0  0  0  0  0  0  0  0  0  0\n    4.3042   -5.0917    0.0000 C   0  0  0  0  0  0  0  0  0  0  0  0\n    3.7708   -4.4000    0.0000 H   1  0  0  0  0  0  0  0  0  0  0  0\n    3.7167   -5.6750    0.0000 H   1  0  0  0  0  0  0  0  0  0  0  0\n    4.8000   -5.7750    0.0000 H   1  0  0  0  0  0  0  0  0  0  0  0\n    5.7292   -5.0917    0.0000 H   1  0  0  0  0  0  0  0  0  0  0  0\n  1  2  1  0  0  0  0\n  1  6  1  0  0  0  0\n  2  3  1  0  0  0  0\n  2  4  1  0  0  0  0\n  2  5  1  0  0  0  0\nM  ISO  4   3   2   4   2   5   2   6   2\nM  END\n',
             density: 0.888 }
  }, {
    label: 'C6D6',
    value: { external_label: 'C6D6',
             molfile: '\n  -OEChem-09281612162D\n\n  12 12  0     0  0  0  0  0  0999 V2000\n    3.4030    1.0000    0.0000 C   0  0  0  0  0  0  0  0  0  0  0  0\n    2.5369    0.5000    0.0000 C   0  0  0  0  0  0  0  0  0  0  0  0\n    4.2690    0.5000    0.0000 C   0  0  0  0  0  0  0  0  0  0  0  0\n    2.5369   -0.5000    0.0000 C   0  0  0  0  0  0  0  0  0  0  0  0\n    4.2690   -0.5000    0.0000 C   0  0  0  0  0  0  0  0  0  0  0  0\n    3.4030   -1.0000    0.0000 C   0  0  0  0  0  0  0  0  0  0  0  0\n    3.4030    1.6200    0.0000 H   1  0  0  0  0  0  0  0  0  0  0  0\n    2.0000    0.8100    0.0000 H   1  0  0  0  0  0  0  0  0  0  0  0\n    4.8059    0.8100    0.0000 H   1  0  0  0  0  0  0  0  0  0  0  0\n    2.0000   -0.8100    0.0000 H   1  0  0  0  0  0  0  0  0  0  0  0\n    4.8059   -0.8100    0.0000 H   1  0  0  0  0  0  0  0  0  0  0  0\n    3.4030   -1.6200    0.0000 H   1  0  0  0  0  0  0  0  0  0  0  0\n  1  2  2  0  0  0  0\n  1  3  1  0  0  0  0\n  1  7  1  0  0  0  0\n  2  4  1  0  0  0  0\n  2  8  1  0  0  0  0\n  3  5  2  0  0  0  0\n  3  9  1  0  0  0  0\n  4  6  2  0  0  0  0\n  4 10  1  0  0  0  0\n  5  6  1  0  0  0  0\n  5 11  1  0  0  0  0\n  6 12  1  0  0  0  0\nM  ISO  6   7   2   8   2   9   2  10   2  11   2  12   2\nM  END\n',
             density: 0.950 }
  }, {
    label: 'D2O',
    value: { external_label: 'D2O',
             molfile: '\n  -OEChem-09281612132D\n\n  3  2  0     0  0  0  0  0  0999 V2000\n    2.5369   -0.1550    0.0000 O   0  0  0  0  0  0  0  0  0  0  0  0\n    3.0739    0.1550    0.0000 H   1  0  0  0  0  0  0  0  0  0  0  0\n    2.0000    0.1550    0.0000 H   1  0  0  0  0  0  0  0  0  0  0  0\n  1  2  1  0  0  0  0\n  1  3  1  0  0  0  0\nM  ISO  2   2   2   3   2\nM  END\n',
             density: 1.107 }
  }];

export const purificationOptions = [{
  label: 'Flash-Chromatography',
  value: 'Flash-Chromatography'
}, {
  label: 'TLC',
  value: 'TLC'
}, {
  label: 'HPLC',
  value: 'HPLC'
}, {
  label: 'Extraction',
  value: 'Extraction'
}, {
  label: 'Distillation',
  value: 'Distillation'
}, {
  label: 'Sublimation',
  value: 'Sublimation'
}, {
  label: 'Crystallisation',
  value: 'Crystallisation'
}];

export const statusOptions = [{
  label: 'Planned',
  value: 'Planned',
}, {
  label: 'Running',
  value: 'Running',
}, {
  label: 'Done',
  value: 'Done',
}, {
  label: 'Analyses Pending',
  value: 'Analyses Pending',
}, {
  label: 'Successful',
  value: 'Successful',
}, {
  label: 'Not Successful',
  value: 'Not Successful',
}];


export const dangerousProductsOptions = [{
  label: 'Causes cancer',
  value: 'Causes cancer'
}, {
  label: 'Mutagenic',
  value: 'Mutagenic'
}, {
  label: 'Damage to environment',
  value: 'Damage to environment'
}, {
  label: 'Explosive (Class 1)',
  value: 'Explosive (Class 1)'
}, {
  label: 'Pressure (Class 2)',
  value: 'Pressure (Class 2)'
}, {
  label: 'Flammable liquid (Class 3)',
  value: 'Flammable liquid (Class 3)'
}, {
  label: 'Flammable solid (Class 4.1)',
  value: 'Flammable solid (Class 4.1)'
}, {
  label: 'Self-flammable solid (Class 4.2)',
  value: 'Self-flammable solid (Class 4.2)'
}, {
  label: 'Flammable/contact with water (Class 4.3)',
  value: 'Flammable/contact with water (Class 4.3)'
}, {
  label: 'Oxidizing (Class 5.1)',
  value: 'Oxidizing (Class 5.1)'
}, {
  label: 'Peroxides (Class 5.2)',
  value: 'Peroxides (Class 5.2)'
}, {
  label: 'Toxic and very toxic (Class 6.1)',
  value: 'Toxic and very toxic (Class 6.1)'
}, {
  label: 'Infective (Class 6.2)',
  value: 'Infective (Class 6.2)'
}, {
  label: 'Radioactive (Class 7)',
  value: 'Radioactive (Class 7)'
}, {
  label: 'Corrosive (Class 8)',
  value: 'Corrosive (Class 8)'
}, {
  label: 'Diverse (Class 9)',
  value: 'Diverse (Class 9)'
}];



export const confirmOptions = [{
  label: "Confirmed",
  value: "Confirmed"
},{
  label: "Unconfirmed",
  value: "Unconfirmed"
}];

export const kindOptions = [{
  label: "1H NMR",
  value: "1H NMR"
},{
  label: "13C NMR",
  value: "13C NMR"
},{
  label: "Mass",
  value: "Mass"
},{
  label: "IR",
  value: "IR"
},{
  label: "EA",
  value: "EA"
},{
  label: "GCMS",
  value: "GCMS"
},{
  label: "HPLC",
  value: "HPLC"
},{
  label: "TLC",
  value: "TLC"
},{
  label: "Crystall-Structure",
  value: "Crystall-Structure"
},{
  label: "Others",
  value: "Others"
}];
