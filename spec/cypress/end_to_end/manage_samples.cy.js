import h20 from '../fixtures/h20.json';

describe('Manage Samples', () => {
  beforeEach(() => {
    cy.createDefaultUser('cu1@complat.edu', 'cu1').then((user1) => {
      cy.appFactories([['create', 'collection', { user_id: user1[0].id }]]).then((collection) => {
        cy.appFactories([['create', 'molecule', {
          inchistring: h20.inchiKey, molecule_svg_file: h20.moleculeSVG, molfile_version: h20.molFileVersion
        }]]).then((molecule) => {
          cy.appFactories([['create', 'sample', {
            short_label: 'PH-1234',
            molecule_id: molecule[0].id,
            collection_ids: collection[0].id,
            user_id: user1[0].id,
            density: 1,
            boiling_point: h20.boiling_point,
            melting_point: h20.melting_point,
            solvent: [{
              label: 'trideuterio(deuteriooxy)methane', smiles: h20.smiles, inshikey: h20.inchiKey, ratio: h20.ratio
            }]
          }]]);
        });
      });
    });
    cy.login('cu1', 'user_password');
    cy.contains('Collection 1').click();
  });

  it('has correct attributes', () => {
    cy.contains('PH-1234').click();
    cy.contains('Melting point').siblings('.input-group').find('input').should('have.attr', 'value', '0.5 – 1');
    cy.contains('Boiling point').siblings('.input-group').find('input').should('have.attr', 'value', '98 – 100');

    cy.get('button[title="Split"]').should('have.attr', 'disabled');

    cy.contains('PH-1234').click();
    cy.contains('Molecule name').siblings('.input-group').find('div[data-value="iupac_name"]');

    cy.contains('PH-1234').click();
    cy.contains('button', 'Density').click();
    cy.contains('button', 'g/m').siblings('input').should('have.attr', 'value', '1');

    cy.contains('PH-1234').click();
    cy.contains('button', 'Molarity').click();
    cy.contains('button', /^M$/).siblings('input').should('have.attr', 'value', '1');

    cy.contains('PH-1234').click();
    cy.get('input[name="solvent_label"]').should('have.attr', 'value', 'trideuterio(deuteriooxy)methane');

    cy.contains('PH-1234').click();
    cy.get('input[name="solvent_ratio"]').should('have.attr', 'value', '100');

    cy.contains('PH-1234').click();
    cy.contains('button', 'mg').siblings('input').should('have.attr', 'value', '1000');

    cy.contains('PH-1234').click();
    cy.contains('Chemical identifiers').click();
    cy.contains('button', 'InChI').siblings('input').should('have.attr', 'readonly', 'readonly')
      .and('have.attr', 'disabled', 'disabled');

    cy.contains('PH-1234').click();
    cy.contains('Chemical identifiers').click();
    cy.contains('span', 'Canonical Smiles').siblings('input').should('have.attr', 'readonly', 'readonly')
      .and('have.attr', 'disabled', 'disabled');
  });
});
