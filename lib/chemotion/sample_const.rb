module Chemotion::SampleConst

  def self.solvents_smiles_options
    [{
      label: 'Acetic acid',
      value: { external_label: 'Acetic acid',
               smiles: 'CC(O)=O',
               density: 1.05 },
    },
    {
      label: 'Acetone',
      value: { external_label: 'Acetone',
               smiles: 'CC(C)=O',
               density: 0.79 }
    },
    {
      label: 'Acetonitrile',
      value: { external_label: 'Acetonitrile',
               smiles: 'CC#N',
               density: 0.78 }
    },
    {
      label: 'Argon',
      value: { external_label: 'Ar',
               smiles: '[Ar]',
              density: 0.001633 }
    },
    {
      label: 'Benzol',
      value: { external_label: 'Benzene',
               smiles: 'C1=CC=CC=C1',
               density: 0.88 }
    },
    {
      label: 'Benzene',
      value: { external_label: 'Benzene',
               smiles: 'C1=CC=CC=C1',
               density: 0.88 }
    },
    {
      label: 'n-Butanol',
      value: { external_label: 'n-Butanol',
               smiles: 'CCCCO',
               density: 0.81 }
    },
    {
      label: 'Carbon tetrachloride (CCl4)',
      value: { external_label: 'CCl4',
               smiles: 'ClC(Cl)(Cl)Cl',
               density: 1.594 }
    },
    {
      label: 'Chloroform',
      value: { external_label: 'Chloroform',
               smiles: 'ClC(Cl)Cl',
               density: 1.48 }
    },
    {
      label: 'Cyclohexane',
      value: { external_label: 'Cyclohexane',
               smiles: 'C1CCCCC1',
               density: 0.78 }
    },
    {
      label: 'Diethyl ether',
      value: { external_label: 'Diethyl ether',
               smiles: 'CCOCC',
               density: 0.71 }
    },
    {
      label: 'Dimethyl sulfoxide (DMSO)',
      value: { external_label: 'DMSO',
               smiles: 'CS(C)=O',
               density: 1.10 }
    },
    {
      label: 'Dimethylformamide (DMF)',
      value: { external_label: 'DMF',
               smiles: 'CN(C)C=O',
               density: 0.95 }
    },
    {
      label: '1,4-Dioxane',
      value: { external_label: '1,4-Dioxane',
               smiles: 'C1COCCO1',
               density: 1.03 }
    },
    {
      label: 'Ethanol',
      value: { external_label: 'Ethanol',
               smiles: 'OCC',
               density: 0.789 }
    },
    {
      label: 'Ethyl acetate',
      value: { external_label: 'Ethyl acetate',
               smiles: 'CC(OCC)=O',
               density: 0.894 }
    },
    {
      label: 'Isopropanol',
      value: { external_label: 'Isopropanol',
               smiles: 'CC(O)C',
               density: 0.78 }
    },
    {
      label: 'Methanol',
      value: { external_label: 'Methanol',
               smiles: 'CO',
               density: 0.79 }
    },
    {
      label: 'Methylene chloride',
      value: { external_label: 'Methylene chloride',
               smiles: 'ClCCl',
               density: 1.33 }
    },
    {
      label: 'Methyl tert-butyl ether (MTBE)',
      value: { external_label: 'MTBE',
               smiles: 'O(C(C)(C)C)C',
               density: 0.74 }
    },
    {
      label: 'N2',
      value: { external_label: 'N2',
               smiles: 'N#N',
               density: 0.00125 }
    },
    {
      label: 'n-Hexane',
      value: { external_label: 'n-Hexane',
               smiles: 'CCCCCC',
               density: 0.66 }
    },
    {
      label: 'N-Methyl-2-pyrrolidone (NMP)',
      value: { external_label: 'NMP',
               smiles: 'O=C1CCCN1C',
               density: 1.03 }
    },
    {
      label: 'Pentane',
      value: { external_label: 'Pentane',
               smiles: 'CCCCC',
               density: 0.63 }
    },
    {
      label: 'Pyridine',
      value: { external_label: 'Pyridine',
               smiles: 'C1=CC=NC=C1',
               density: 0.98 }
    },
    {
      label: 'Tetrahydrofuran (THF)',
      value: { external_label: 'THF',
               smiles: 'C1CCCO1',
               density: 0.889 }
    },
    {
      label: 'Toluene',
      value: { external_label: 'Toluene',
               smiles: 'CC1=CC=CC=C1',
               density: 0.87 }
    },
    {
      label: 'Water',
      value: { external_label: 'Water',
               smiles: '[H]O[H]',
               density: 1.00 }
    },
    {
      label: 'CDCl3',
      value: { external_label: 'CDCl3',
               smiles: '[2H]C(Cl)(Cl)Cl',
               density: 1.500 }
    },
    {
      label: 'MeOD-d4',
      value: { external_label: 'MeOD-d4',
               smiles: '[2H]OC([2H])([2H])[2H]',
               density: 0.888 }
    },
    {
      label: 'C6D6',
      value: { external_label: 'C6D6',
               smiles: '[2H]c1c([2H])c([2H])c([2H])c([2H])c1[2H]',
               density: 0.950 }
    },
    {
      label: 'D2O',
      value: { external_label: 'D2O',
               smiles: '[2H]O[2H]',
               density: 1.107 }
    },
    {
      label: 'Cyclopentane',
      value: { external_label: 'Cyclopentane',
                 smiles: 'C1CCCC1',
                 density: 0.74 }
    },
    {
      label: 'Nitromethane',
      value: { external_label: 'Nitromethane',
                 smiles: 'C[N+]([O-])=O',
                 density: 1.14 }
    },
    {
      label: 'Formic acid',
      value: { external_label: 'Formic acid',
                 smiles: 'O=CO',
                 density: 1.22 }
    },
    {
      label: 'n-octanol',
      value: { external_label: 'n-octanol',
                 smiles: 'CCCCCCCCO',
                 density: 0.817 }
    },
    {
      label: 'n-propanol',
      value: { external_label: 'n-propanol',
                 smiles: 'CCCO	',
                 density: 0.8 }
    },
    {
      label: 'Dimethylacetamide',
      value: { external_label: 'Dimethylacetamide',
                 smiles: 'CC(N(C)C)=O',
                 density: 0.94 }
    },
    {
      label: '1,2-xylene',
      value: { external_label: '1,2-xylene',
                 smiles: 'CC1=CC=CC=C1C',
                 density: 0.8755 }
    },
    {
      label: '1,3-xylene',
      value: { external_label: '1,3-xylene',
                 smiles: 'CC1=CC=CC(C)=C1',
                 density: 0.8598 }
    },
    {
        label: '1,4-xylene',
        value: { external_label: '1,4-xylene',
                 smiles: 'CC1=CC=C(C)C=C1',
                 density: 0.8565 }
    },
    {
      label: 'Sulfolane',
      value: { external_label: 'Sulfolane',
                 smiles: 'O=S1(CCCC1)=O',
                 density: 1.261 }
    },
    {
        label: '2-methoxy ethanol',
        value: { external_label: '2-methoxy ethanol',
                 smiles: 'OCCOC',
                 density: 0.97 }
    },
    {
        label: 'Carbon tribromide',
        value: { external_label: 'Carbon tribromide',
                 smiles: 'BrC(Br)([H])Br',
                 density: 2.89 }
    },
    {
        label: 'Cyclopentylmethylether',
        value: { external_label: 'Cyclopentylmethylether',
                 smiles: 'COC1CCCC1',
                 density: 0.86 }
    },
    {
        label: '1,2-Dichloroethane',
        value: { external_label: '1,2-Dichloroethane',
                 smiles: 'ClCCCl',
                 density: 1.25 }
    }]
  end
end
