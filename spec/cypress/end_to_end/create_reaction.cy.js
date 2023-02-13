describe('create and update reaction', () => {
  beforeEach(() => {
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
  });

  it('test name', () => {
    // add test code here
    cy.login('cu1', 'user_password');
    cy.visit('mydb/collection/3/');
    cy.get('div').find('[id="tree-id-Collection 1"]').click();
    cy.get('#create-split-button').click();
    cy.get('#create-reaction-button').click();

    const source1 = cy.get(':nth-child(1) > [style="background-color: rgb(245, 245, 245); cursor: pointer;"] > [style="vertical-align: middle; text-align: center;"]');
    const target1 = cy.get(':nth-child(1) > [fill="true"] > :nth-child(1)');

    const dataTransfer = new DataTransfer();
    source1.trigger('dragstart', { dataTransfer });
    target1.trigger('drop', { dataTransfer });

    const source2 = cy.get(':nth-child(2) > [style="background-color: rgb(245, 245, 245); cursor: pointer;"] > [style="vertical-align: middle; text-align: center;"]');
    const target2 = cy.get('[fill="true"] > :nth-child(3)');

    // const dataTransfer = new DataTransfer();
    source2.trigger('dragstart', { dataTransfer });
    target2.trigger('drop', { dataTransfer });

    cy.get('input[name="reaction_name"]').first().clear().type('Reaction A');
    cy.get('#submit-reaction-btn').click();
    cy.contains('Reaction A');

    cy.get('input[name="reaction_name"]').first().clear().type('Reaction B');
    cy.get('#submit-reaction-btn').click();
    cy.contains('Reaction B');
  });
});
