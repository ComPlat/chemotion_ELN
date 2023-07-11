//cy.intercept('GET', '/api/v1/syncCollections/sync_remote_roots.json').as('colletions4');
//cy.intercept('PATCH', '/api/v1/collections').as('collections.patch');

describe('Collections APIs Testing', () => {

    it('GET collections/root', () => {
        cy.createDefaultUser('complat.user@complat.edu', 'CU').then((user) => {
            cy.appFactories([['create', 'collection', { user_id: user[0].id, label: 'Col1' }]]);
          });
        cy.visit('users/sign_in');
        cy.login('CU', 'user_password');
        cy.request('/api/v1/collections/roots.json').as('roots');
        cy.get('@roots').then(response => {
            expect(response.status).to.eq(200);
            const collectionData = response.body['collections'][0];
            expect(collectionData.id).to.eq(3);
            expect(collectionData.label).to.eq('Col1');
        });
    });

    it('GET collections/shared_root', () => {
        cy.createDefaultUser('complat.user@complat.edu', 'CU');
        cy.visit('users/sign_in');
        cy.login('CU', 'user_password');
        cy.request('/api/v1/collections/shared_roots.json').as('sharedroots');
        cy.get('@sharedroots').then(response => {
            expect(response.status).to.eq(200);
            expect(response.body['collections'].length).to.eq(0);
        });
    });

    it('GET /collections/remote_roots', () => {
        cy.createDefaultUser('complat.user@complat.edu', 'CU');
        cy.visit('users/sign_in');
        cy.login('CU', 'user_password');
        cy.request('/api/v1/collections/remote_roots.json').as('remoteroots');
        cy.get('@remoteroots').then(response => {
            expect(response.status).to.eq(200);
            expect(response.body['collections'].length).to.eq(0);
        });
    });

    it('GET /collections/sync_remote_roots', () => {
        cy.createDefaultUser('complat.user@complat.edu', 'CU');
        cy.visit('users/sign_in');
        cy.login('CU', 'user_password');
        cy.request('/api/v1/syncCollections/sync_remote_roots.json').as('syncremoteroots');
        cy.get('@syncremoteroots').then(response => {
            expect(response.status).to.eq(200);
            console.log(response.body);
            expect(response.body['syncCollections'].length).to.eq(0);
        });
    });
 });