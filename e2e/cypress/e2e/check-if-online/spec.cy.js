/// <reference types="cypress" />

it('check that vote has the right title', () => {
    cy.visit(Cypress.env('voteUrl'))
    cy.title().should('eq', 'Burritos vs Tacos!')
})

it('i love burritos', () => {
    cy.visit(Cypress.env('voteUrl'))
    cy.title().should('eq', 'Burritos vs Tacos!')
    
    // get the current votes
    cy.task('getVotesForA').then((votesForA) => {
        cy.task('getVotesForB').then((votesForB) => {
            expect(votesForA.count).to.not.be.null
            expect(votesForB.count).to.not.be.null
            
            // vote for option A
            cy.get('#a').click();

            // Assert that the button is disabled
            cy.get('#a').should('be.disabled');

            // Assert that checkmark was displayed after voting
            cy.get('#a')
            .find('i')
            .should('exist')
            .and('have.class', 'fa')
            .and('have.class', 'fa-check-circle');

            cy.task('getVotesForA').then((votesForAAfter) => {
                cy.task('getVotesForB').then((votesForBAfter) => {
                    expect(votesForAAfter.count).to.not.be.null
                    expect(votesForBAfter.count).to.not.be.null

                    // verify that the votes are updated in the database
                    const expectedVotesForA = parseInt(votesForA.count) + 1
                    const actualVotesForA = parseInt(votesForAAfter.count)
                    expect(expectedVotesForA).to.be.equal(actualVotesForA)
                    expect(votesForBAfter.count).to.be.equal(votesForB.count)
                
                    const totalVotes = actualVotesForA + parseInt(votesForBAfter.count)
                    cy.visit(Cypress.env('resultUrl'))
                    cy.origin(Cypress.env('resultUrl'), {args: {totalVotes}}, ({totalVotes}) => { 
                        // verify that the votes are updated in the results service
                        cy.title().should('eq', 'Burritos vs Tacos -- Result')
                        cy.get('#result')
                        .find('span')
                        .should('exist')
                        .and('have.text', `${totalVotes} votes`)
                    })
                })
            })
        })
    })
})