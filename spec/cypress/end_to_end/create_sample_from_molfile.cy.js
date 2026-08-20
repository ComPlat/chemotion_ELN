describe('Sample Creation from molfile', () => {
  it('creates sample by pasting a molfile', () => {
    let moleculeId;

    cy.createDefaultUser('cm1@complat.edu', 'cm1').then((user) => {
      cy.appFactories([['create', 'collection', { user_id: user[0].id }]]);
      cy.appFactories([['create', 'molecule']]).then((molecule) => {
        moleculeId = molecule[0].id;
      });
    });

    cy.login('cm1', 'user_password');
    cy.contains('Collection 1').click();
    cy.contains('Create').click();
    cy.contains('Create Sample').click();
    cy.contains('Chemical identifiers').click();
    cy.contains('Molfile').siblings('textarea').type(
      '\n  Ketcher\n\n  1  0  0  0  0  0            999 V2000\n'
      + '    0.0000    0.0000    0.0000 C   0  0\nM  END',
      { parseSpecialCharSequences: false }
    );

    cy.intercept('POST', '**/api/v1/molecules', (req) => {
      req.reply({
        statusCode: 200,
        body: {
          id: moleculeId,
          cano_smiles: 'C',
          inchikey: 'VNWKTOKETHGBQD-UHFFFAOYSA-N',
          inchistring: 'InChI=1S/CH4/h1H4',
          iupac_name: 'methane',
          molecular_weight: 16,
          sum_formular: 'CH4',
          molfile: 'DUMMY_MOLFILE',
          molfile_version: 'V2000',
          molecule_svg_file: 'dummy.svg',
          temp_svg: 'dummy.svg',
          ob_log: ''
        }
      });
    }).as('createMoleculeFromMolfile');

    cy.get('#molfile-create-molecule').click();
    cy.wait('@createMoleculeFromMolfile');
    cy.clickDetailFooterButton('Create');

    cy.get('i.icon-sample').closest('button[role="tab"]').click();
    cy.get('#elements-list-view').contains('cm1-1');
  });
});
