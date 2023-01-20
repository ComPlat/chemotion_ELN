describe('testing landing page attributes', () => {
    beforeEach(() => {
        cy.visit('home')
        cy.contains('h3', 'Welcome to Chemotion Electronic Lab Notebook.')
    })

    it('Chemotion repository link', () => {
        cy.contains('Chemotion repository').should('have.attr', 'href', 'http://www.chemotion.net')
    })

    it('Complat link', () => {
        cy.contains('Complat').should('have.attr', 'href', 'http://www.complat.kit.edu/')
    })

    it('Complat on GitHub link', () => {
        cy.contains('Complat on Github').should('have.attr', 'href', 'https://github.com/ComPlat')
    })

    it('ELN link', () => {
        cy.contains('ELN').should('have.attr', 'href', '/')
    })

    it('About link', () => {
        cy.contains('About').should('have.attr', 'href', '/about')
    })
})