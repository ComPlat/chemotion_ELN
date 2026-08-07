describe('Sample Creation', () => {
  it('creates sample', () => {
    let moleculeId;

    cy.createDefaultUser('cu1@complat.edu', 'cu1').then((user) => {
      cy.appFactories([['create', 'collection', { user_id: user[0].id }]]);
      cy.appFactories([['create', 'molecule']]).then((molecule) => {
        moleculeId = molecule[0].id;
      });
    });

    cy.login('cu1', 'user_password');
    cy.contains('Collection 1').click();
    cy.contains('Create').click();
    cy.contains('Create Sample').click();
    cy.contains('Chemical identifiers').click();
    cy.contains('Canonical Smiles').siblings('input').type('c1ccccc1');

    cy.intercept('POST', '**/api/v1/molecules/smiles', (req) => {
      req.reply({
        statusCode: 200,
        body: {
          id: moleculeId,
          cano_smiles: 'CC(=O)OC1=CC=CC=C1C(=O)O',
          inchikey: 'BSYNRYMUTXBXSQ-UHFFFAOYSA-N',
          inchistring: 'InChI=1S/C9H8O4/c1-6(10)13-8-5-3-2-4-7(8)9(11)12/h2-5H,1H3,(H,11,12)',
          iupac_name: '2-acetyloxybenzoic acid',
          molecular_weight: 42,
          sum_formular: 'C9H8O4',
          molfile: 'DUMMY_MOLFILE',
          molfile_version: 'V2000',
          molecule_svg_file: 'dummy.svg',
          temp_svg: 'dummy.svg',
          ob_log: ''
        }
      });
    }).as('createMoleculeFromSmiles');

    cy.get('#smile-create-molecule').click();
    cy.wait('@createMoleculeFromSmiles');
    cy.clickDetailFooterButton('Create');

    cy.get('i.icon-sample').closest('button[role="tab"]').click();
    cy.get('#elements-list-view').contains('cu1-1');
  });
});
