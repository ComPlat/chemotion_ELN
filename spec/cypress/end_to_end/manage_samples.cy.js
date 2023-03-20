const moleculeSVG = '81ba09b10beaa89f190c39faa85ced3ea20728cda625d884410ac0ab96bc62824375cff5da9c3ea19bf335aa6a872591e58cf07eb7ec7878318b011e4fe362a5.svg';
const inshiString = 'InChI=1S/H2O/h1H2';
const molFileVersion = 'V2000';
const smiles = '[2H]OC([2H])([2H])[2H]';
const inchiKey = 'OKKJLVBELUTLKV-MZCSYVLQSA-N';

describe('Manage samples', () => {
  beforeEach(() => {
    cy.visit('users/sign_in');

    cy.createDefaultUser('cu1@complat.edu', 'cu1').then((user1) => {
      cy.appFactories([['create', 'collection', { label: 'Col1', user_id: user1[0].id }]]).then((collection) => {
        cy.appFactories([['create', 'molecule', {
          molecular_weight: 171.03448, inchistring: inshiString, molecule_svg_file: moleculeSVG, molfile_version: molFileVersion
        }]]).then((molecule) => {
          cy.appFactories([['create', 'sample', {
            name: 'PH-1234',
            real_amount_value: 4.671,
            molecule_id: molecule[0].id,
            collection_ids: collection[0].id,
            user_id: user1[0].id,
            density: 1,
            boiling_point: '[98, 100]',
            melting_point: '[0.5, 1]',
            solvent: [{
              label: 'trideuterio(deuteriooxy)methane', smiles, inshiekey: inchiKey, ratio: '100'
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
      cy.get(':nth-child(3) > .form-group > .input-group > .form-control').should('have.attr', 'value', '98 – 100');
      cy.get(':nth-child(4) > .form-group > .input-group > .form-control').should('have.attr', 'value', '0.5 – 1');
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

  it('test molecule label to be equal to "iupac_name"', () => {
    cy.login('cu1', 'user_password');
    cy.visit('/mydb/collection/3/');
    cy.get('table').contains('td', 'a01-1').click().then(() => {
      cy.get('#react-select-2--value > div.Select-value').invoke('text').then((text) => {
        expect(text).equal('iupac_name');
      });
    });
  });

  it('test density is set to "1.0000"', () => {
    cy.login('cu1', 'user_password');
    cy.visit('/mydb/collection/3/');
    cy.get('table').contains('td', 'a01-1').click().then(() => {
      cy.get('#tab-density-molarity-tab-density').click();
      cy.get('.numeric-input-unit_M > .input-group > .bs-form--compact').should('have.value', '1.0000');
    });
  });

  it('test Molarity is set to "1.0000"', () => {
    cy.login('cu1', 'user_password');
    cy.visit('/mydb/collection/3/');
    cy.get('table').contains('td', 'a01-1').click().then(() => {
      cy.get('.numeric-input-unit_M > .input-group > .bs-form--compact').should('have.value', '1.0000');
    });
  });

  it('test solvent name to be equal to "trideuterio(deuteriooxy)methane"', () => {
    cy.login('cu1', 'user_password');
    cy.visit('/mydb/collection/3/');
    cy.get('table').contains('td', 'a01-1').click().then(() => {
      cy.get('#Solvents').click();
      cy.get('[width="50%"] > .bs-form--compact').should('have.value', 'trideuterio(deuteriooxy)methane');
    });
  });

  it('test solvent ratio to be equal to "100"', () => {
    cy.login('cu1', 'user_password');
    cy.visit('/mydb/collection/3/');
    cy.get('table').contains('td', 'a01-1').click().then(() => {
      cy.get('#Solvents').click();
      cy.get('[width="26%"] > .bs-form--compact').should('have.value', '100');
    });
  });

  it('test solvent ratio to be equal to "100"', () => {
    cy.login('cu1', 'user_password');
    cy.visit('/mydb/collection/3/');
    cy.get('table').contains('td', 'a01-1').click().then(() => {
      cy.get('#Solvents').click();
      cy.get('[width="26%"] > .bs-form--compact').should('have.value', '100');
    });
  });

  it('test Amount value equal to "4671"', () => {
    cy.login('cu1', 'user_password');
    cy.visit('/mydb/collection/3/');
    cy.get('table').contains('td', 'a01-1').click().then(() => {
      cy.get('.numeric-input-unit_g > .input-group > .bs-form--compact').should('have.value', '4671');
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
