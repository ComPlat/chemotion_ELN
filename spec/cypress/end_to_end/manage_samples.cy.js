import h20 from '../fixtures/h20.json';

describe('Manage Samples', () => {
  beforeEach(() => {
    cy.visit('users/sign_in');
    cy.createDefaultUser('cu1@complat.edu', 'cu1').then((user1) => {
      cy.appFactories([['create', 'collection', { label: 'Col1', user_id: user1[0].id }]]).then((collection) => {
        cy.appFactories([['create', 'molecule', {
          molecular_weight: 171.03448, inchistring: h20.inchiKey, molecule_svg_file: h20.moleculeSVG, molfile_version: h20.molFileVersion
        }]]).then((molecule) => {
          cy.appFactories([['create', 'sample', {
            name: 'PH-1234',
            real_amount_value: 4.671,
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
  });

  it.only('test if melting_pint and boiling_point exists', () => {
    cy.login('cu1', 'user_password');
    cy.visit('/mydb/collection/3/');
    cy.get('table').contains('td', 'a01-1').click().then(() => {
      cy.get('#additionalProperties').click();
      cy.get('[data-cy="cy_Melting point"] > .form-control').should('have.attr', 'value', '0.5 – 1');
      cy.get('[data-cy="cy_Boiling point"] > .form-control').should('have.attr', 'value', '98 – 100');
    });
  });

  it('test if create-split-button is disabled', () => {
    cy.login('cu1', 'user_password');
    cy.visit('/mydb/collection/all/');
    cy.get('#create-split-button').should('be.disabled');
  });

  it('test if split-sample is disabled', () => {
    cy.login('cu1', 'user_password');
    cy.visit('/mydb/collection/1/');
    cy.get('#create-split-button').click();
    cy.get(':nth-child(12) > a').parent().should('have.class', 'disabled');
  });

  it('test molecule value to be equal to "iupac_name"', () => {
    cy.login('cu1', 'user_password');
    cy.visit('/mydb/collection/3/');
    cy.get('table').contains('td', 'a01-1').click().then(() => {
      cy.get('#react-select-5--value-item').invoke('text').then((text) => {
        expect(text).equal('iupac_name');
      });
    });
  });

  it('test density is set to "1.0000"', () => {
    cy.login('cu1', 'user_password');
    cy.visit('/mydb/collection/3/');
    cy.get('table').contains('td', 'a01-1').click().then(() => {
      cy.get('#tab-density-molarity-tab-density').click();
      cy.get('.numeric-input-unit_M > .input-group > input').should('have.value', '1.0000');
    });
  });

  it('test Molarity is set to "1.0000"', () => {
    cy.login('cu1', 'user_password');
    cy.visit('/mydb/collection/3/');
    cy.get('table').contains('td', 'a01-1').click().then(() => {
      cy.get('.numeric-input-unit_M > .input-group > input').should('have.value', '1.0000');
    });
  });

  it('test solvent name to be equal to "trideuterio(deuteriooxy)methane"', () => {
    cy.login('cu1', 'user_password');
    cy.visit('/mydb/collection/3/');
    cy.get('table').contains('td', 'a01-1').click().then(() => {
      cy.get('#Solvents').click();
      cy.get('[width="50%"] > input').should('have.value', 'trideuterio(deuteriooxy)methane');
    });
  });

  it('test solvent ratio to be equal to "100"', () => {
    cy.login('cu1', 'user_password');
    cy.visit('/mydb/collection/3/');
    cy.get('table').contains('td', 'a01-1').click().then(() => {
      cy.get('#Solvents').click();
      cy.get('[width="26%"] > input').should('have.value', '100');
    });
  });

  it('test solvent ratio to be equal to "100"', () => {
    cy.login('cu1', 'user_password');
    cy.visit('/mydb/collection/3/');
    cy.get('table').contains('td', 'a01-1').click().then(() => {
      cy.get('#Solvents').click();
      cy.get('[width="26%"] > input').should('have.value', '100');
    });
  });

  it('test Amount value equal to "4671"', () => {
    cy.login('cu1', 'user_password');
    cy.visit('/mydb/collection/3/');
    cy.get('table').contains('td', 'a01-1').click().then(() => {
      cy.get('.numeric-input-unit_g > .input-group > input').should('have.value', '4671');
    });
  });

  it('test if inchistringInput is disabled and readonly', () => {
    cy.login('cu1', 'user_password');
    cy.visit('/mydb/collection/3/');
    cy.get('table').contains('td', 'a01-1').click().then(() => {
      cy.get('.chem-identifiers-section > .list-group-item').click();
      cy.get('#inchistringInput').should('have.attr', 'readonly', 'readonly');
      cy.get('#inchistringInput').should('have.attr', 'disabled', 'disabled');
    });
  });

  it('test if Canonical Smiles is disabled and readonly', () => {
    cy.login('cu1', 'user_password');
    cy.visit('/mydb/collection/3/');
    cy.get('table').contains('td', 'a01-1').click().then(() => {
      cy.get('.chem-identifiers-section > .list-group-item').click();
      cy.get('#smilesInput').should('have.attr', 'readonly', 'readonly');
      cy.get('#smilesInput').should('have.attr', 'disabled', 'disabled');
    });
  });
});
