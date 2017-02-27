const solventsWithDescription = [{
    label: 'Acetic, Acetic acid-d4',
    value: 'Acetic'
  }, {
    label: 'Acetone, Acetone-d6',
    value: 'Acetone'
  }, {
    label: 'C6D6, Benzene-d6',
    value: 'C6D6'
  }, {
    label: 'CD2Cl2, Dichlromethane-d2',
    value: 'CD2Cl2'
  }, {
    label: 'CD3CN, Acetonitrile-d3',
    value: 'CD3CN'
  }, {
    label: 'CD3CN_SPE, LC-SPE solvent (Acetonitrile)',
    value: 'CD3CN_SPE'
  }, {
    label: 'CD3NO2, Nitromethan',
    value: 'CD3NO2'
  }, {
    label: 'CD3OD_SPE, LC-SPE solvent (Methanol-d4)',
    value: 'CD3OD_SPE'
  }, {
    label: 'CDCl3, Chloroform-d',
    value: 'CDCl3'
  }, {
    label: 'CH3CN+D2O, HPLC solvent (acetonitril/D2O)',
    value: 'CH3CN+D2O'
  }, {
    label: 'CH3OH+D2O, HPLC solvent (methanol/D2O)',
    value: 'CH3OH+D2O'
  }, {
    label: 'D2O, Deuteriumoxide',
    value: 'D2O'
  }, {
    label: 'D2O_salt, Deuteriumoxide with salt',
    value: 'D2O_salt'
  }, {
    label: 'DMF, N,N-diemthylfomamide-d7',
    value: 'DMF'
  }, {
    label: 'DMSO, Dimethylsulfoxide-d6',
    value: 'DMSO'
  }, {
    label: 'Dioxane, Dioxane-d8',
    value: 'Dioxane'
  }, {
    label: 'EtOD, Ethanol-d6',
    value: 'EtOD'
  }, {
    label: 'H2O+D2O, 90% H2O and 10% D2O',
    value: 'H2O+D2O'
  }, {
    label: 'H2O+D2O_salt, 90% H2O and 10% D2O with salt',
    value: 'H2O+D2O_salt'
  }, {
    label: 'HDMSO, 90% DMSO and 10%+DMSO-d6',
    value: 'HDMSO'
  }, {
    label: 'Juice, Fruit Juice',
    value: 'Juice'
  }, {
    label: 'MeOD, Methanol-d8',
    value: 'MeOD'
  }, {
    label: 'None, No solvent',
    value: 'None'
  }, {
    label: 'Plasma, Blood plasma',
    value: 'Plasma'
  }, {
    label: 'Pyr, Pyridine-d6',
    value: 'Pyr'
  }, {
    label: 'TFE, Trifluoroethanol-d3',
    value: 'TFE'
  }, {
    label: 'THP, Tetrahydrofuran-d8',
    value: 'THP'
  }, {
    label: 'T_H2=+D2O+Me4NCl, (CD3)4NCl in 90% H2O and 10% D2O',
    value: 'T_H2=+D2O+Me4NCl'
  }, {
    label: 'T_H2=+D2O+NaAc, Sodium acetate in 90% H2O and 10% D2O',
    value: 'T_H2=+D2O+NaAc'
  }, {
    label: 'T_H2=+D2O+Pivalate, Pivalate-d9 in 90% H2O and 10% D2O',
    value: 'T_H2=+D2O+Pivalate'
  }, {
    label: 'T_MeOD, Methanol-d4, for NMR thermometer',
    value: 'T_MeOD'
  }, {
    label: 'Tol, Toluene-d8',
    value: 'Tol'
  }, {
    label: 'Urine, Urine',
    value: 'Urine'
  }, {
    label: 'oC6D4Cl2, o-dichlorobenzene-d4',
    value: 'oC6D4Cl2'
  }, {
    label: 'pC6D4Br2, p-dibromobenzene-d4',
    value: 'pC6D4Br2'
  }
]

export const solvents = solventsWithDescription.map((solvent) => ({
  label: solvent.value,
  value: solvent.value
}))

const experimentsWithDescription = [{
    label: 'Proton, 1H experiment 16 scans',
    value: 'Proton',
    time: 42
  }, {
    label: 'Proton128, 1H experiment 128 scans',
    value: 'Proton128',
    time: 22
  }, {
    label: 'COSYGPSW, Sw opt. COSY with gradients (magn. mode)',
    value: 'COSYGPSW'
  }, {
    label: 'C13CPD32, C13 exp. Comp. Pulse dec. 32 scans',
    value: 'C13CPD32'
  }, {
    label: 'C13CPD256, C13 exp. Comp. Pulse dec. 256 scans',
    value: 'C13CPD256'
  }, {
    label: 'C13CPD600, C13 exp. Comp. Pulse dec. 600 scans',
    value: 'C13CPD600'
  }, {
    label: 'C13, C13 exp. Comp. Pulse dec. 1024 scans',
    value: 'C13'
  }, {
    label: 'C13CPD2k, C13 exp. Comp. Pulse dec. 2k scans',
    value: 'C13CPD2k'
  }, {
    label: 'C13DEPT90, C13 dept CH-only',
    value: 'C13DEPT90'
  }, {
    label: 'C13DEPT135, C13 dept CH, CH3 pos. CH2 neg',
    value: 'C13DEPT135'
  }, {
    label: 'PROF19DEC, 1H with F19 decoupling',
    value: 'PROF19DEC'
  }, {
    label: 'PROP31DEC, 1H with P31 decoupling',
    value: 'PROP31DEC'
  }, {
    label: 'PROB11DEC, 1H with B11 decoupling',
    value: 'PROB11DEC'
  }, {
    label: '11B, 11B CPD exp. decoupling',
    value: '11B'
  }, {
    label: 'B11ZG, 11B exp. no decoupling',
    value: 'B11ZG'
  }, {
    label: '7Li, 7Li no decoupling 256 scans',
    value: '7Li'
  }, {
    label: 'F19, 19F exp. No decoupling',
    value: 'F19'
  }, {
    label: 'F19CPD, 19F exp. comp. pulse decoupling',
    value: 'F19CPD'
  }, {
    label: 'N15, 15N exp. no decoupling',
    value: 'N15'
  }, {
    label: 'N15IG, 15N exp. inverse gated',
    value: 'N15IG'
  }, {
    label: 'P31, 31P exp. no decoupling',
    value: 'P31'
  }, {
    label: 'P31CPD, 31P exp. comp. pulse decoupling',
    value: 'P31CPD'
  }, {
    label: 'HMQCGP, sw opt. HMQC with gradients (magn. mode)',
    value: 'HMQCGP'
  }, {
    label: 'HSQCEDETGP, sw opt. edited HSQC with gradients (e/a TPPI)',
    value: 'HSQCEDETGP'
  }, {
    label: 'HMBCGPND, sw opt. HMBC with gradients',
    value: 'HMBCGPND'
  }, {
    label: 'NOESYPHSW, sw opt. NOESY (States-TPPI)',
    value: 'NOESYPHSW'
  }, {
    label: 'ROESYPHPR, Phase sensitive ROESY with solvent suppression',
    value: 'ROESYPHPR'
  }
]

export const experiments = experimentsWithDescription.map((e) => ({
  label: e.value,
  value: e.value,
  time: e.time || ""
}))
