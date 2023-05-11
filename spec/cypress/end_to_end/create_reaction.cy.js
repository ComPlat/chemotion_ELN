describe('Reactions Create/Update', () => {
  it('create and update reaction', () => {
    cy.createDefaultUser('cu1@complat.edu', 'cu1').then((user) => {
      cy.appFactories([['create', 'collection', { user_id: user[0].id }]]).then((collection) => {
        cy.appFactories([['create', 'molecule', { molecular_weight: 171.03448 }]]).then((molecule) => {
          cy.appFactories([['create', 'sample', {
            name: 'Material', target_amount_value: 7.15, molecule_id: molecule[0].id, collection_ids: collection[0].id
          }]]);
        });
        cy.appFactories([['create', 'molecule', { molecular_weight: 133.15058 }]]).then((molecule) => {
          cy.appFactories([['create', 'sample', {
            name: 'Product', real_amount_value: 4.671, molecule_id: molecule[0].id, collection_ids: collection[0].id
          }]]);
        });
      });
    });

    cy.visit('users/sign_in');
    cy.login('cu1', 'user_password');
    cy.visit('mydb/collection/3/');
    cy.get('div').find('[id="tree-id-Collection 1"]').click();
    cy.get('#create-split-button').click();
    cy.get('#create-reaction-button').click();

    cy.get(':nth-child(1) > [style="background-color: rgb(245, 245, 245); cursor: pointer;"] > [style="vertical-align: middle; text-align: center;"]').as('source1');
    cy.get(':nth-child(1) > [fill="true"] > :nth-child(1)').as('target1');

    const dataTransfer = new DataTransfer();
    cy.get('@source1').trigger('dragstart', { dataTransfer });
    cy.get('@target1').trigger('drop', { dataTransfer });

    cy.get(':nth-child(2) > [style="background-color: rgb(245, 245, 245); cursor: pointer;"] > [style="vertical-align: middle; text-align: center;"]').as('source2');
    cy.get('[fill="true"] > :nth-child(3)').as('target2');
    cy.get('@source2').trigger('dragstart', { dataTransfer });
    cy.get('@target2').trigger('drop', { dataTransfer });

    cy.get('input[name="reaction_name"]').first().clear().type('Reaction A');
    cy.get('#submit-reaction-btn').click();
    cy.contains('Reaction A');

    cy.get('input[name="reaction_name"]').first().clear().type('Reaction B');
    cy.get('#submit-reaction-btn').click();
    cy.contains('Reaction B');
  });
});
