describe('Reaction Variations', () => {
  // A row is split over the pinned and the scrolling part of the grid, each with the same row-index.
  const cell = (index, colId) => cy.get(`.ag-row[row-index="${index}"] .ag-cell[col-id="${colId}"]`).first();
  const rows = () => cy.get('.ag-center-cols-container .ag-row');
  const columnPicker = (groupTitle) => {
    cy.get('.ag-header-group-cell').contains(groupTitle).closest('.ag-header-group-cell')
      .find('button[title="Show or hide columns"]').click();
    return cy.get('.reaction-variations-grid__column-picker').should('be.visible');
  };

  beforeEach(() => {
    cy.createDefaultUser('complat.user1@complat.edu', 'cu1').then((user) => {
      cy.appFactories([['create', 'collection', { user_id: user[0].id, label: 'Col1' }]])
        .then((collection) => {
          cy.appFactories([['create', 'valid_sample', {
            collection_ids: [collection[0].id], short_label: 'Bar', external_label: 'Bar'
          }]]).then((startingMaterial) => {
            cy.appFactories([['create', 'reaction_with_variations', {
              collection_ids: [collection[0].id],
              name: 'Foo',
              short_label: 'RV1',
            }]]).then((reaction) => {
              cy.appFactories([['create', 'reactions_starting_material_sample', {
                reaction_id: reaction[0].id, sample_id: startingMaterial[0].id, reference: true,
              }]]);
            });
          });
        });
    });
    cy.visit('users/sign_in');
    cy.login('cu1', 'user_password');
    cy.contains('Col1').click();
    cy.get('i.icon-reaction').closest('button[role="tab"]').click();
    // The grid is rebuilt once the reaction has loaded, which would close a column picker opened before.
    cy.intercept('GET', '/api/v1/reactions/*').as('reaction');
    cy.contains('Foo').click();
    cy.wait('@reaction');
    cy.get('#reaction-detail-tab-tab-reactionVariationsTab').click();
    cy.contains('button', 'Add variation');
  });

  it('shows the variations of the reaction', () => {
    rows().should('have.length', 2);
    cell(0, 'variation_group').find('input').should('have.value', '1.0');
    cell(1, 'variation_group').find('input').should('have.value', '2.0');
    cy.get('.ag-header-group-cell').contains('Starting material 1').should('exist');
    cy.contains('label', 'Show:');
  });

  it('adds, copies and removes rows', () => {
    cy.contains('button', 'Add variation').click();
    rows().should('have.length', 3);

    cell(2, 'variation_control').find('.fa.fa-clone').closest('button').click();
    rows().should('have.length', 4);

    cell(3, 'variation_control').find('.fa.fa-trash').closest('button').click();
    cy.contains('.modal-title', 'Confirm Removal').should('be.visible');
    cy.contains('button', 'Remove variation').click();
    rows().should('have.length', 3);
  });

  it('removes all rows', () => {
    cy.contains('button', 'Remove all variations').click();
    cy.contains('.modal-title', 'Confirm Removal').should('be.visible');
    cy.contains('button', 'Remove variations').click();

    rows().should('have.length', 0);
  });

  it('hides all columns of a material but the one ticked, and shows them again', () => {
    columnPicker('Starting material 1').contains('button', 'Hide all').click();
    // The popup stays open, so a single column can be picked.
    cy.get('.reaction-variations-grid__column-picker').should('be.visible')
      .contains('label', 'Mass').click();
    cy.get('body').type('{esc}');

    cy.get('.ag-header [col-id="starting_materials_0_mass"]').should('exist');
    cy.get('.ag-header [col-id="starting_materials_0_amount"]').should('not.exist');

    columnPicker('Starting material 1').contains('button', 'Show all').click();
    cy.get('body').type('{esc}');
    cy.get('.ag-header [col-id="starting_materials_0_amount"]').should('exist');
  });

  it('switches the unit of a column, also for a row added afterwards', () => {
    const massUnit = (index) => cell(index, 'starting_materials_0_mass').find('button').first();
    cy.get('.ag-header [col-id="starting_materials_0_mass"] .variations-unit-switch').invoke('text')
      .then((before) => {
        cy.get('.ag-header [col-id="starting_materials_0_mass"] .variations-unit-switch').click();
        cy.get('.ag-header [col-id="starting_materials_0_mass"] .variations-unit-switch')
          .should('not.have.text', before);
      });

    cy.contains('button', 'Add variation').click();
    rows().should('have.length', 3);
    massUnit(0).invoke('text').then((unit) => {
      massUnit(2).should('have.text', unit);
    });
  });

  it('opens a variation', () => {
    cell(0, 'variation_control').contains('button', 'Open').click();
    cy.contains('h2', 'Variation #').should('be.visible');
    cy.contains('h2', 'Variation #').parent().within(() => {
      cy.contains('Add reagent...').should('not.exist');
      cy.contains('Add solvent...').should('not.exist');
    });
  });

  it('sorts the rows by a column, and back to their own order on the third click', () => {
    const header = () => cy.get('.ag-header [col-id="reaction_temperature"] .variations-sort-header');
    const firstGroup = () => cell(0, 'variation_group').find('input');

    header().click();
    firstGroup().should('have.value', '1.0');
    header().should('have.attr', 'title').and('contain', 'ascending');

    header().click();
    firstGroup().should('have.value', '2.0');

    header().click();
    firstGroup().should('have.value', '1.0');
  });

  it('writes the table to .csv', () => {
    cy.contains('button', 'Export to CSV').click();
    cy.readFile('cypress/downloads/RV1-variations.csv').should('contain', 'Group');
  });
});
