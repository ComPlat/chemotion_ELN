describe('Sample API Testing', () => {

    it('GET samples/', () => {
        cy.createDefaultUser('complat.user@complat.edu', 'CU').then((user) => {
            cy.appFactories([['create', 'collection', { user_id: user[0].id, label: 'Col1' }]]);
          });
        cy.visit('users/sign_in');
        cy.login('CU', 'user_password');
        cy.request('/api/v1/samples.json').as('samples');
        cy.get('@samples').then(response => {
            expect(response.status).to.eq(200);
            expect(response.body['samples'].length).to.eq(0);
        });
    });

    it('GET samples/', () => {
        cy.appFactories([['create', 'valid_sample']]);
        cy.appFactories([['create', 'collection', { user_id: 1, label: 'Col1' }]]);
        cy.login('foobar1@bar.de', 'testtest');
        cy.request('/api/v1/samples.json').as('samples');
        cy.get('@samples').then(response => {
            const sampleData = response.body['samples'][0];
            expect(response.status).to.eq(200);
            expect(response.body['samples'].length).to.eq(1);
            expect(sampleData.id).to.eq(1);
            expect(sampleData.metrics).to.eq('mmm');
            expect(sampleData.short_label).to.eq('a01-1');
            expect(sampleData.name).to.eq('Sample 1');
            expect(sampleData.type).to.eq('sample');
            expect(sampleData.molecule.boiling_point).to.eq(100);
            console.log(response.body['samples'][0]);
        });
    });
 });