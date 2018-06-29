import * as _ from 'lodash-es';
import * as React from 'react';
import * as PropTypes from 'prop-types';
import classNames from 'classnames';

import { Cog, detailsPage, navFactory, NavTitle } from '../utils';
import { EnvironmentPage } from '../environment';
import { DeploymentConfigsDetails, DeploymentConfigMenuActions } from '../deployment-config';
import { RouteDetails } from '../routes';
import { AppTopologyMetrics } from './app-topology-metrics';

export class AppTopologyDetails extends React.Component {
  constructor(props) {
    super(props);

    this.state = {
      detailsCollapsed: false,
      activeNav: null
    };
  };

  componentDidUpdate(prevProps) {
    if  (this.props.item && !prevProps.item) {
      this.setState({
        detailsCollapsed: false,
        activeNav: null
      });
    }
  }

  onCollapseClick = () => {
    this.setState({
      detailsCollapsed: !this.state.detailsCollapsed
    });
  };

  updateActiveTab = (event, tabName) => {
    event.preventDefault();
    this.setState({activeNav: tabName});
  };

  renderTabs(pages) {
    const { activeNav } = this.state;
    const activePageName = activeNav || pages[0].name;

    const divider = <li className="co-m-vert-nav__menu-item co-m-vert-nav__menu-item--divider" key="_divider" />;

    return (
      <ul className="co-m-vert-nav__menu">
        {_.flatten(_.map(pages, ({name, href}, i) => {
          const itemClass = classNames('co-m-vert-nav__menu-item', {'co-m-vert-nav-item--active': name === activePageName});
          const tab = (
            <li className={itemClass} key={name} >
              <a href="#" onClick={(e) => this.updateActiveTab(e, name)}>
                {name}
              </a>
            </li>
          );

          // These tabs go before the divider
          const before = ['', 'edit', 'yaml'];
          return (!before.includes(href) && i !== 0 && before.includes(pages[i - 1].href)) ? [divider, tab] : [tab];
        }))}
      </ul>
    );
  }

  renderDeploymentConfigDetails() {
    const { item } = this.props;
    const { activeNav } = this.state;

    const envPath = ['spec','template','spec','containers'];
    const environmentComponent = (props) => <EnvironmentPage
      obj={item}
      rawEnvData={_.get(item, 'spec.template.spec.containers')}
      envPath={envPath}
      readOnly={false}
    />;
    const pages = [navFactory.details(DeploymentConfigsDetails), navFactory.editYaml(), navFactory.pods(), navFactory.envEditor(environmentComponent)];

    const activePageName = activeNav || pages[0].name;
    const activePage = _.find(pages, {name: activePageName});

    return (
      <div className="details-body">
        <AppTopologyMetrics deploymentConfig={item} />
        <div className="co-m-vert-nav">
          {this.renderTabs(pages)}
          <activePage.component obj={item} />
        </div>
      </div>
    );
  }

  renderRouteDetails() {
    const { item } = this.props;
    const { activeNav } = this.state;

    const pages = [navFactory.details(detailsPage(RouteDetails)), navFactory.editYaml()];

    const activePageName = activeNav || pages[0].name;
    const activePage = _.find(pages, {name: activePageName});

    return (
      <div className="details-body">
        <div className="co-m-vert-nav">
          {this.renderTabs(pages)}
          <activePage.component obj={item} />
        </div>
      </div>
    );
  }

  renderDetails() {
    const { item } = this.props;
    const { detailsCollapsed } = this.state;

    if (detailsCollapsed || !item) {
      return null;
    }

    if (item.kind === 'DeploymentConfig') {
      return this.renderDeploymentConfigDetails();
    }

    if (item.kind === 'Route') {
      return this.renderRouteDetails();
    }

    return null;
  }

  render() {
    const { item, onClose } = this.props;
    const { detailsCollapsed } = this.state;
    const itemName = _.get(item, 'metadata.name');

    if (!item) {
      return <div className="app-topology-details" />;
    }

    const detailsClass = classNames(
      'app-topology-details shown',
      {
        'details-collapsed': detailsCollapsed
      }
    );

    let menuActions;
    if (item.kind === 'DeploymentConfig') {
      menuActions = DeploymentConfigMenuActions;
    } else if (item.kind === 'Route') {
      menuActions = Cog.factory.common;
      console.dir(menuActions);
    }

    const obj = {
      data: item
    };

    return (
      <div className={detailsClass}>
        <div className='details-header'>
          <a className="details-header-button details-toggle-collapse" onClick={this.onCollapseClick} />
          <a className="details-header-button details-close" onClick={onClose} />
          <NavTitle detail={true} obj={obj} title={itemName} menuActions={menuActions} kind={item.kind} />
        </div>
        {this.renderDetails()}
      </div>
    );
  };
}

AppTopologyDetails.defaultProps = {
};

AppTopologyDetails.propTypes = {
  item: PropTypes.object,
  onClose: PropTypes.func.isRequired
};
