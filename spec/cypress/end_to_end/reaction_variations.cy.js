describe('Reaction Variations', () => {
  const openColumnSelectionModal = () => {
    cy.contains('button', 'Select Columns').click();
    cy.contains('.modal-title', 'Column Selection').should('be.visible');
  };

  const removeColumn = (group, label) => {
    openColumnSelectionModal();
    cy.contains('.app-modal h5', group).parent().within(() => {
      cy.get(`[aria-label="Remove ${label}"]`).click({ force: true });
    });
    cy.contains('.modal-title', 'Confirm De-selection').should('be.visible');
    cy.contains('button', `Remove ${label}`).click();
    cy.contains('.modal-title', 'Column Selection').should('be.visible');
    cy.contains('button', 'Apply').click();
  };

  const addColumn = (group, label) => {
    openColumnSelectionModal();
    cy.contains('.app-modal h5', group).parent().within(() => {
      cy.get('input').first().click({ force: true });
    });
    cy.get('body').contains('[class*="option"]', label).click({ force: true });
    cy.contains('.app-modal h5', group).parent().contains(label).should('exist');
    cy.contains('button', 'Apply').click();
  };

  const openFirstEntrySelectionModal = () => {
    cy.contains('button', 'Bar').siblings('button').find('.fa.fa-pencil').closest('button').click();
    cy.contains('.modal-title', /Select entries for/i).should('be.visible');
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
              starting_material_ids: [startingMaterial[0].id],
            }]]);
          });
        });
    });
    cy.visit('users/sign_in');
    cy.login('cu1', 'user_password');
    cy.contains('Col1').click();
    cy.get('i.icon-reaction').closest('button[role="tab"]').click();
    cy.contains('Foo').click();
    cy.get('#reaction-detail-tab-tab-reactionVariationsTab').click();
  });

  it('adds, removes, and copies row', () => {
    cy.get('.ag-row[row-id="1"]').contains('R1-1');
    cy.get('.ag-row[row-id="2"]').should('not.exist');

    // Add row
    cy.contains('Add variation').click();
    cy.get('.ag-row[row-id="2"]').contains('R1-2');

    // Copy row
    cy.get('.ag-row[row-id="2"]').find('.fa.fa-clone').parent('button').click();
    cy.get('.ag-row[row-id="3"]').contains('R1-3');

    // Remove row
    cy.get('.ag-row[row-id="3"]').find('.fa.fa-trash-o').parent('button').click();
    cy.get('.ag-row[row-id="3"]').should('not.exist');
  });

  it('removes all rows', () => {
    cy.contains('button', 'Remove all variations').click();
    cy.contains('.modal-title', 'Confirm Removal').should('be.visible');
    cy.contains('button', 'Remove variations').click();

    cy.get('.ag-center-cols-container .ag-row').should('have.length', 0);
  });

  it('adds and removes columns', () => {
    removeColumn('Metadata', 'Notes');
    cy.get('.ag-header').contains(/notes/i).should('not.exist');

    addColumn('Metadata', 'Notes');
    cy.get('.ag-header').contains(/notes/i).should('exist');

    cy.get('.ag-header').contains(/Bar/i).should('exist');
    removeColumn('Starting Materials', 'Bar');
    cy.get('.ag-header').contains(/Bar/i).should('not.exist');
  });

  it('adds and removes entries', () => {
    openFirstEntrySelectionModal();
    cy.contains('.app-modal tbody tr', 'amount').within(() => {
      cy.get('input[type="checkbox"]').then(($checkbox) => {
        if (!$checkbox.is(':checked')) {
          cy.wrap($checkbox).click({ force: true });
        }
      });
    });
    cy.contains('button', 'Apply').click();
    cy.get('.ag-header').contains(/amount/i).should('exist');

    openFirstEntrySelectionModal();
    cy.contains('.app-modal tbody tr', 'amount').within(() => {
      cy.get('input[type="checkbox"]').then(($checkbox) => {
        if ($checkbox.is(':checked')) {
          cy.wrap($checkbox).click({ force: true });
        }
      });
    });
    cy.contains('button', 'Apply').click();

    cy.get('.ag-header').contains(/amount/i).should('not.exist');
  });

  it('writes table to .csv', () => {
    cy.contains('button', 'Export to CSV').click();
    cy.readFile('cypress/downloads/export.csv');
  });

  it('sorts table', () => {
    // Sort ascending
    cy.contains('.ag-header-cell-text', 'Tools').click();
    cy.get('.ag-row[row-index="0"]').contains('R1-0');

    // Sort descending
    cy.contains('.ag-header-cell-text', 'Tools').click();
    cy.get('.ag-row[row-index="0"]').contains('R1-1');
  });
});
