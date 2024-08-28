export const masthead = {
  username: {
    shouldBeVisible: () =>
      cy
        .byTestID(Cypress.env('BRIDGE_KUBEADMIN_PASSWORD') ? 'user-dropdown' : 'username')
        .should('be.visible'),
    shouldHaveText: (text: string) =>
      cy
        .byTestID(Cypress.env('BRIDGE_KUBEADMIN_PASSWORD') ? 'user-dropdown' : 'username')
        .should('have.text', text),
  },
  userDropdown: () => cy.byTestID('user-dropdown'),
  copyLoginCommand: () => cy.byTestID('copy-login-command').find('a'),
  clickMastheadLink: (path: string) => {
    return cy.byTestID(path).click();
  },
};
