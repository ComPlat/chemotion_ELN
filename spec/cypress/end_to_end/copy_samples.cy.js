describe('Copy Samples', () => {
  const userName = 'cu1';
  const collectionName = 'Collection1';
  const secondCollectionName = 'Collection2';
  const sampleName = 'Sample1';

  beforeEach(() => {
    cy.createDefaultUser(`${userName}@complat.edu`, userName).then((user) => {
      cy.appFactories([['create', 'collection', { user_id: user[0].id, label: collectionName }]])
        .then((collection1) => {
          cy.appFactories([['create', 'collection', { user_id: user[0].id, label: secondCollectionName }]])
            .then(() => {
              cy.appFactories([['create', 'valid_sample', {
                short_label: sampleName,
                collection_ids: collection1[0].id,
                user_id: user[0].id
              }]]);
            });
        });
    });

    cy.login(userName, 'user_password');

    // Open Sample Detail Modal
    cy.contains(collectionName).click();
    cy.contains(sampleName).click();

    // Copy Sample
    cy.get('i.fa.fa-clone').closest('button').click({ force: true });
    cy.get('#modal-collection-id-select').click();
  });

  it('copies sample to same collection', () => {
    cy.get('body').contains('.chemotion-select__option', collectionName).click();
    cy.contains('button', 'Copy').click();
    cy.clickDetailFooterButton('Create');

    // Copied Sample exists in sample list
    cy.get('div[class="element-groups-renderer"]').contains('cu1-1');
  });

  it('copies sample to different collection', () => {
    cy.get('body').contains('.chemotion-select__option', secondCollectionName).click();
    cy.contains('button', 'Copy').click();
    cy.clickDetailFooterButton('Create');

    cy.contains(secondCollectionName).click();
    cy.get('div[class="element-groups-renderer"]').contains('cu1-1');
  });
});
