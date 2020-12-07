import { Plugin } from '@console/plugin-sdk';
import { getExecutableCodeRef } from '@console/dynamic-plugin-sdk/src/coderefs/coderef-utils';
import { WatchK8sResources } from '@console/internal/components/utils/k8s-watch-hook';
import {
  TopologyComponentFactory,
  TopologyDataModelFactory,
  TopologyDisplayFilters,
  TopologySidePanelProvider,
} from '@console/topology/src/extensions/topology';
import {
  getHelmComponentFactory,
  getHelmTopologyDataModel,
  getIsHelmResource,
  getTopologyFilters,
  applyDisplayOptions,
  helmReleasePanelSupported,
  getHelmReleasePanel,
  helmWorkloadPanelSupported,
  getHelmWorkloadPanel,
} from './index';

export type HelmTopologyConsumedExtensions =
  | TopologyComponentFactory
  | TopologyDataModelFactory
  | TopologyDisplayFilters
  | TopologySidePanelProvider;

const getHelmWatchedResources = (namespace: string): WatchK8sResources<any> => {
  return {
    secrets: {
      isList: true,
      kind: 'Secret',
      namespace,
      optional: true,
    },
  };
};

export const helmTopologyPlugin: Plugin<HelmTopologyConsumedExtensions> = [
  {
    type: 'Topology/ComponentFactory',
    properties: {
      getFactory: getHelmComponentFactory,
    },
  },
  {
    type: 'Topology/DataModelFactory',
    properties: {
      id: 'helm-topology-model-factory',
      priority: 400,
      getDataModel: getHelmTopologyDataModel,
      resources: getHelmWatchedResources,
      isResourceDepicted: getIsHelmResource,
    },
  },
  {
    type: 'Topology/DisplayFilters',
    properties: {
      getTopologyFilters: getExecutableCodeRef(getTopologyFilters),
      applyDisplayOptions: getExecutableCodeRef(applyDisplayOptions),
    },
  },
  {
    type: 'Topology/SidePanel',
    properties: {
      id: 'helm-release-panel',
      priority: 300,
      supportsEntity: getExecutableCodeRef(helmReleasePanelSupported),
      sidePanel: getExecutableCodeRef(getHelmReleasePanel),
    },
  },
  {
    type: 'Topology/SidePanel',
    properties: {
      id: 'helm-workload-panel',
      priority: 1000,
      supportsEntity: getExecutableCodeRef(helmWorkloadPanelSupported),
      sidePanel: getExecutableCodeRef(getHelmWorkloadPanel),
    },
  },
];
