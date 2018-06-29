import * as _ from 'lodash-es';
import * as React from 'react';
import * as PropTypes from 'prop-types';
import { Button, EmptyState, Grid } from 'patternfly-react';
import Select from 'react-select';

import { LabelSelector } from '../../module/k8s/labelSelector';
import { namespaceProptype } from '../../propTypes';
import { SafetyFirst } from '../safety-first';
import { PodUtils } from '../../module/utils/pod-utils';
import Topology from '../utils/topology';
import { AppTopologyDetails } from './app-topology-details';

export class AppTopology extends SafetyFirst {
  constructor(props) {
    super(props);

    this.debug = true;
    this.state = {
      selectedId: '',
      selectedItem: null,
      filterValue: '',
      containers: [],
      nodes: [],
      edges: []
    }
  };

  componentDidUpdate(prevProps, prevState) {
    if (this.props.namespace !== prevProps.namespace ||
        this.props.replicationControllers !== prevProps.replicationControllers ||
        this.props.pods !==  prevProps.pods ||
        this.props.deploymentConfigs !== prevProps.deploymentConfigs ||
        this.props.routes !== prevProps.routes ||
        this.props.services !== prevProps.services ||
        this.props.volumes !== prevProps.volumes) {
      this.createTopologyData();
    } else if (this.state.filterValue !== prevState.filterValue) {
      const filteredItems = this.filterTopologyItems(this.state.topologyItems);
      this.setState({filteredItems, topologyGroups: this.createTopologyGroups(filteredItems)});
    }
  }

  sortByDeploymentVersion = (replicationControllers, descending) => {
    const compareDeployments = (left, right) => {
      const leftVersion = parseInt(_.get(left, 'openshift.io/deployment-config.latest-version'), 10);
      const rightVersion = parseInt(_.get(right, 'openshift.io/deployment-config.latest-version'), 10);

      // Fall back to sorting by name if no deployment versions.
      let leftName, rightName;
      if (!_.isFinite(leftVersion) && !_.isFinite(rightVersion)) {
        leftName = _.get(left, 'metadata.name', '');
        rightName = _.get(right, 'metadata.name', '');
        if (descending) {
          return rightName.localeCompare(leftName);
        }
        return leftName.localeCompare(rightName);
      }

      if (!leftVersion) {
        return descending ? 1 : -1;
      }

      if (!rightVersion) {
        return descending ? -1 : 1;
      }

      if (descending) {
        return rightVersion - leftVersion;
      }
      return leftVersion - rightVersion;
    };

    return _.toArray(replicationControllers).sort(compareDeployments);
  };

  filterTopologyItems = items => {
    const {filterValue} = this.state;

    if (!filterValue) {
      return items;
    }

    const filterString = filterValue.toLowerCase();
    let filteredItems = [];
    _.forEach(items, item => {
      const name = _.get(item.deploymentConfig, 'metadata.name', '');
      if (name.toLowerCase().includes(filterString)) {
        filteredItems.push(item);
      }
    });

    return filteredItems;
  };

  createNodeData = (kind, item, data) => {
    const selected = this.state.selectedId ===  _.get(item, 'metadata.uid');
    const newNode = {
      kind,
      ...item,
      ...data,
      selected
    };

    if (selected) {
      this.setState({
        selectedItem: newNode
      });
    }

    return newNode;
  };

  createTopologyData = () => {
    const {replicationControllers, pods, deploymentConfigs, routes, services, volumes} = this.props;

    let containers = [];
    let nodes = [];
    let edges = [];

    _.forEach(replicationControllers.data, function(replicationController) {
      const controllerUID = _.get(replicationController, 'metadata.uid');
      const controllerPods = _.filter(pods.data, function(pod) {
        return _.some(_.get(pod, 'metadata.ownerReferences'), {
          uid: controllerUID,
          controller: true
        });
      });
      replicationController.pods = controllerPods;
    });

    let allServices = [];
    _.forEach(services.data, (service) => {
      allServices.push(this.createNodeData(
        'Service',
        service,
        {
          data: {
            id: _.get(service, 'metadata.uid'),
            title: _.get(service, 'metadata.name')
          }
        }
      ));
    });

    allServices = _.keyBy(allServices, 'metadata.name');
    const selectorsByService = _.mapValues(allServices, function(service) {
      return new LabelSelector(service.spec.selector);
    });

    _.forEach(deploymentConfigs.data, (deploymentConfig) => {
      // Determine the replication controllers associated with this DC
      const dcUID = _.get(deploymentConfig, 'metadata.uid');
      const dcControllers = _.filter(replicationControllers.data, function(replicationController) {
        return _.some(_.get(replicationController, 'metadata.ownerReferences'), {
          uid: dcUID,
          controller: true
        });
      });
      const ordered = this.sortByDeploymentVersion(dcControllers, true);
      deploymentConfig.replicationControllers = dcControllers;
      deploymentConfig.currentController = _.head(ordered);
      deploymentConfig.prevController = _.size(ordered) < 2 ? null : ordered[1];

      // Get the services for this deployment config
      let configServices = [];
      const configTemplate = _.get(deploymentConfig, 'spec.template');
      _.each(selectorsByService, (selector, serviceName) => {
        if (selector.matches(configTemplate)) {
          configServices.push(allServices[serviceName]);
        }
      });

      // Determine the current pods for this DC
      const pods = _.size(_.get(deploymentConfig, 'currentController.pods', [])) > 0 ?
        _.get(deploymentConfig, 'currentController.pods') :
        _.get(deploymentConfig, 'prevController.pods');
      const podCount = PodUtils.getPodCount(pods);
      const countByPhase = PodUtils.getPodPhases(pods);

      nodes.push(this.createNodeData(
        'DeploymentConfig',
        deploymentConfig,
        {
          services: configServices,
          data: {
            id: dcUID,
            title: _.get(deploymentConfig, 'metadata.name'),
            podCount,
            countByPhase,
            iconClass: 'pficon pficon-builder-image'
          }
        }
      ));
    });

    _.forEach(routes.data, (route) => {
      // Get the services for this route
      let routeServices = [];
      _.each(allServices, service => {
        if (_.get(service, 'metadata.name') === _.get(route, 'spec.to.name')) {
          routeServices.push(service);
        }
      });
      nodes.push(this.createNodeData(
        'Route',
        route,
        {
          services: routeServices,
          data: {
            id: _.get(route, 'metadata.uid'),
            title: _.get(route, 'spec.host'),
            iconClass: 'pficon pficon-route',
            showLabel: false
          }
        }
      ));
    });

    /** Currently not showing Volumes
     *
    _.forEach(volumes.data, (volume) => {
      nodes.push(this.createNodeData(
        'PersistentVolumeClaim',
        volume,
        {
          data: {
            id: _.get(volume, 'metadata.uid'),
            title: _.get(volume, 'metadata.name'),
            iconClass: 'pficon pficon-volume'
          }
        }
      ));
    });
    *
    **/

    _.forEach(_.filter(nodes, node => node.kind === "DeploymentConfig"), deploymentConfig => {
      _.forEach(deploymentConfig.services, service => {
        const routes = _.filter(nodes, routeNode =>
          routeNode.kind === "Route" && _.find(routeNode.services, routeService => routeService === service ));
        if (_.size(routes)) {
          _.forEach(routes, route => {
            let edge = this.getEdge(route, deploymentConfig, service);
            edges.push(edge);
          })
        } else {
          // Add a fake route and an edge to it for spacing purposes
          const fakeRoute = {
            data: {
              id: _.get(service, 'metadata.uid') + '_noRoute',
              hidden: true,
              showLabel: false
            }
          };
          nodes.push(fakeRoute);
          edges.push(this.getEdge(fakeRoute, deploymentConfig, service, true));
        }
      });
    });

    if (this.debug && this.props.loaded) {
      console.log("========================= Updated Data =========================");
      console.log('replicationControllers:');
      console.dir(_.get(replicationControllers, 'data'));

      console.log('pods:');
      console.dir(_.get(pods, 'data'));

      console.log('deploymentConfigs:');
      console.dir(_.get(deploymentConfigs, 'data'));

      console.log('services:');
      console.dir(_.get(services, 'data'));

      console.log('routes:');
      console.dir(_.get(routes, 'data'));

      console.log('volumes:');
      console.dir(_.get(volumes, 'data'));

      console.dir('nodes:');
      console.dir(nodes);

      console.dir('edges:');
      console.dir(edges);
    }

    this.setState({
      containers: containers,
      nodes: nodes,
      edges: edges,
    });
  };

  getEdgeId = (source, target) => `${source.data.id}-${target.data.id}`;

  getEdge = (source, target, service, hidden) => {
    const id = this.getEdgeId(source, target);
    return {
      kind: 'edge',
      data: {
        id,
        source,
        target,
        service,
        hidden: !!hidden
      }
    };
  };

  handleItemClick = item => {
    const { containers, nodes, edges } = this.state;

    if (!item) {
      return;
    }

    if (item.selected) {
      item.selected = false;
    } else {
      containers.forEach(container => {
        container.nodes.forEach(node => {
          node.selected = false;
        });
      });
      nodes.forEach(node => {
        node.selected = false;
      });
      edges.forEach(edge => {
        edge.selected = false;
      });

      item.selected = true;
    }

    this.setState({
      selectedId: item.selected ? item.data.id : '',
      selectedItem: item.selected ? item : null,
    });
  };

  handleFilterChange = event => {
    this.setState({filterValue: event.target.value});
  };

  clearFilter = () => {
    this.setState({filterValue: ''});
  };

  onCloseDetails = () => {
    this.setState({
      selectedId: '',
      selectedItem: null
    });
  };

  renderHeader() {
    const { groups, selectedGroup, filterValue } = this.state;

    return (
      <div className="co-m-pane__filter-bar">
        <div className="co-m-pane__filter-bar-group">
          <input
            type="text"
            autoCapitalize="none"
            className="form-control text-filter"
            placeholder="Filter Deployment Configs by name..."
            onChange={this.handleFilterChange}
            value={filterValue}
            onKeyDown={e => e.key === 'Escape' && e.target.blur()}
          />
        </div>
        <div className="co-m-pane__filter-bar-group">
          <span className="co-m-pane__filter-bar-group-label">
            Group by
          </span>
          <span className="co-m-pane__filter-bar-group-value">
            <Select
              name="group"
              value={selectedGroup}
              options={groups}
              disabled={!_.size(groups)}
              placeholder="Select a grouping..."
              onChange={this.handleGroupChange}
            />
          </span>
        </div>
      </div>

    );
  }

  render() {
    const { namespace } = this.props;
    const { containers, nodes, edges, selectedItem } = this.state;

    const allNodes = [...nodes];
    containers.forEach(container => {
      allNodes.push(...container.nodes);
    });

    return (
      <div className="app-topology">
        {this.renderHeader()}
        <div className="app-topology-view">
          <Topology
            className="topology-view"
            containers={containers}
            nodes={nodes}
            edges={edges}
            handleItemClick={this.handleItemClick}
          />
          <AppTopologyDetails item={selectedItem} namespace={namespace} onClose={this.onCloseDetails} />
        </div>
      </div>
    );
  }
}

AppTopology.defaultProps = {
};

AppTopology.propTypes = {
  namespace: namespaceProptype,
  replicationControllers: PropTypes.object,
  pods: PropTypes.object,
  deploymentConfigs: PropTypes.object,
  routes: PropTypes.object,
  services: PropTypes.object,
  volumes: PropTypes.object
};
