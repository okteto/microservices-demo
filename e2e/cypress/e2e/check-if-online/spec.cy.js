/// <reference types="cypress" />

it('check that vote has the right title', () => {
    cy.visit(Cypress.env('voteUrl'))
    cy.title().should('eq', 'Burritos vs Tacos!')
})

it('check that result has the right title', () => {
    cy.visit(Cypress.env('resultUrl'))
    cy.title().should('eq', 'Burritos vs Tacos -- Result')
})

it('i love burritos', () => {
    cy.visit(Cypress.env('voteUrl'))
    cy.get('#a').click();

    // Assert that the button is disabled
    cy.get('#a').should('be.disabled');

    // Assert that checkmark was displayed after voting
    cy.get('#a')
      .find('i')
      .should('exist')
      .and('have.class', 'fa')
      .and('have.class', 'fa-check-circle');
})