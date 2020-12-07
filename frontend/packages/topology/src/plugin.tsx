import * as _ from 'lodash';
import { Plugin, ReduxReducer, ModelDefinition, ModelFeatureFlag } from '@console/plugin-sdk';
import {
  OperatorsTopologyConsumedExtensions,
  operatorsTopologyPlugin,
} from './operators/operatorsTopologyPlugin';
import reducer from './utils/reducer';
import * as models from './models';
import { ServiceBindingModel } from './models/service-binding';
import { ALLOW_SERVICE_BINDING_FLAG } from './const';
import { defaultDecoratorsPlugin } from './components/graph-view/components/nodes/decorators/defaultDecoratorsPlugin';
import { TopologyDecoratorProvider, TopologySidePanelProvider } from './extensions';
import { getExecutableCodeRef } from '@console/dynamic-plugin-sdk/src/coderefs/coderef-utils';
import {
  applicationPanelSupported,
  getTopologyApplicationPanel,
} from './components/application-panel';

type ConsumedExtensions =
  | ModelDefinition
  | ModelFeatureFlag
  | ReduxReducer
  | TopologyDecoratorProvider
  | TopologySidePanelProvider
  | OperatorsTopologyConsumedExtensions;

const plugin: Plugin<ConsumedExtensions> = [
  {
    type: 'ModelDefinition',
    properties: {
      models: _.values(models),
    },
  },
  {
    type: 'FeatureFlag/Model',
    properties: {
      model: ServiceBindingModel,
      flag: ALLOW_SERVICE_BINDING_FLAG,
    },
  },
  {
    type: 'ReduxReducer',
    properties: {
      namespace: 'devconsole',
      reducer,
    },
  },
  ...operatorsTopologyPlugin,
  ...defaultDecoratorsPlugin,
  {
    type: 'Topology/SidePanel',
    properties: {
      id: 'application-side-panel',
      priority: 1000,
      supportsEntity: getExecutableCodeRef(applicationPanelSupported),
      sidePanel: getExecutableCodeRef(getTopologyApplicationPanel),
    },
  },
];

export default plugin;
