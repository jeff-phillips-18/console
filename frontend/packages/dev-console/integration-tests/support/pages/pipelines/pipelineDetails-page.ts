import { detailsPage } from '../../../../../integration-tests-cypress/views/details-page';
import { pageTitle } from '../../constants/pageTitle';
import {
  clusterTriggerBindingDetailsPO,
  eventListenerDetailsPO,
  pipelineDetailsPO,
  triggerTemplateDetailsPO,
} from '../../pageObjects/pipelines-po';

export const pipelineDetailsPage = {
  verifyTitle: (pipelineName: string) => detailsPage.titleShouldContain(pipelineName),

  clickActionMenu: () => cy.byLegacyTestID('actions-menu-button').click(),

  selectFromActionsDropdown: (action: string) => {
    cy.get(pipelineDetailsPO.actionsMenu)
      .should('be.enabled')
      .click();
    cy.byTestActionID(action).click();
  },

  verifyTriggerTemplateSection: () =>
    cy.get(pipelineDetailsPO.details.triggerTemplateSection).should('be.visible'),
  verifyPage: () =>
    cy.get(pipelineDetailsPO.title).should('contain.text', pageTitle.PipelineDetails),

  verifyTabs: () => {
    cy.byLegacyTestID('horizontal-link-details-page~Details').should('be.visible');
    cy.byLegacyTestID('horizontal-link-Metrics').should('be.visible');
    cy.byLegacyTestID('horizontal-link-details-page~YAML').should('be.visible');
    cy.byLegacyTestID('horizontal-link-Pipeline Runs').should('be.visible');
    cy.byLegacyTestID('horizontal-link-Parameters').should('be.visible');
    cy.byLegacyTestID('horizontal-link-Resources').should('be.visible');
  },

  verifyFieldsInDetailsTab: () => {
    cy.byTestID('Name').should('be.visible');
    cy.byTestID('Namespace').should('be.visible');
    cy.byTestID('Labels').should('be.visible');
    cy.byTestID('Annotations').should('be.visible');
    cy.byTestID('Created at').should('be.visible');
    cy.byTestID('Owner').should('be.visible');
    cy.get('.odc-dynamic-resource-link-list--addSpaceBelow')
      .find('dl dt')
      .should('contain.text', 'Tasks');
  },

  selectTriggerTemplateLink: () => cy.get(pipelineDetailsPO.details.triggerTemplateLink).click(),
};

export const triggerTemplateDetailsPage = {
  verifyPage: () =>
    cy.get(triggerTemplateDetailsPO.title).should('contain.text', pageTitle.TriggerTemplateDetails),
  verifyTabs: () => {
    cy.get('ul.co-m-horizontal-nav__menu li a').as('tabName');
    cy.get('@tabName')
      .eq(0)
      .should('have.text', 'Details');
    cy.get('@tabName')
      .eq(1)
      .should('have.text', 'YAML');
  },
  verifyFields: () => {
    cy.get('[data-test-id="resource-summary"] dt').as('fieldNames');
    cy.get('@fieldNames')
      .eq(0)
      .should('have.text', 'Name');
    cy.get('@fieldNames')
      .eq(1)
      .should('have.text', 'Namespace');
    cy.get('@fieldNames')
      .eq(2)
      .should('have.text', 'Labels');
    cy.get('@fieldNames')
      .eq(3)
      .should('have.text', 'Annotations');
    cy.get('@fieldNames')
      .eq(4)
      .should('have.text', 'Created At');
    cy.get('@fieldNames')
      .eq(5)
      .should('have.text', 'Owner');
    cy.contains('Pipelines').should('be.visible');
    cy.contains('Event Listeners').should('be.visible');
  },
  verifyActionsDropdown: () => cy.get(triggerTemplateDetailsPO.actions).should('be.visible'),
  selectEventListener: () => cy.get(triggerTemplateDetailsPO.details.eventListenerLink).click(),
};

export const eventListenerDetailsPage = {
  verifyPage: () =>
    cy.get(eventListenerDetailsPO.title).should('contain.text', pageTitle.EventListenerDetails),
  verifyTabs: () => {
    cy.get('ul.co-m-horizontal-nav__menu li a').as('tabName');
    cy.get('@tabName')
      .eq(0)
      .should('have.text', 'Details');
    cy.get('@tabName')
      .eq(1)
      .should('have.text', 'YAML');
  },
  verifyFields: () => {
    cy.get('[data-test-id="resource-summary"] dt').as('fieldNames');
    cy.get('@fieldNames')
      .eq(0)
      .should('have.text', 'Name');
    cy.get('@fieldNames')
      .eq(1)
      .should('have.text', 'Namespace');
    cy.get('@fieldNames')
      .eq(2)
      .should('have.text', 'Labels');
    cy.get('@fieldNames')
      .eq(3)
      .should('have.text', 'Annotations');
    cy.get('@fieldNames')
      .eq(4)
      .should('have.text', 'Created At');
    cy.get('@fieldNames')
      .eq(5)
      .should('have.text', 'Owner');
    cy.contains('Triggers').should('be.visible');
  },
  verifyActionsDropdown: () => cy.get(eventListenerDetailsPO.actions).should('be.visible'),
  selectTriggerBindingLink: () => cy.get(eventListenerDetailsPO.details.triggerBindingLink).click(),
};

export const clusterTriggerBindingDetailsPage = {
  verifyPage: () =>
    cy
      .get(clusterTriggerBindingDetailsPO.title)
      .should('contain.text', pageTitle.ClusterTriggerTemplateDetails),
  verifyTabs: () => {
    cy.get('ul.co-m-horizontal-nav__menu li a').as('tabName');
    cy.get('@tabName')
      .eq(0)
      .should('have.text', 'Details');
    cy.get('@tabName')
      .eq(1)
      .should('have.text', 'YAML');
  },
  verifyFields: () => {
    cy.get('[data-test-id="resource-summary"] dt .details-item__label').as('fieldNames');
    cy.get('@fieldNames')
      .eq(0)
      .should('have.text', 'Name');
    cy.get('@fieldNames')
      .eq(1)
      .should('have.text', 'Labels');
    cy.get('@fieldNames')
      .eq(2)
      .should('have.text', 'Annotations');
    cy.get('@fieldNames')
      .eq(3)
      .should('have.text', 'Created At');
    cy.get('@fieldNames')
      .eq(4)
      .should('have.text', 'Owner');
  },
  verifyActionsDropdown: () => cy.get(clusterTriggerBindingDetailsPO.actions).should('be.visible'),
};
