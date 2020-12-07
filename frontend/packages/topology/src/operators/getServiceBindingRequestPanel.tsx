import * as React from 'react';
import { GraphElement } from '@patternfly/react-topology';
import { TYPE_SERVICE_BINDING } from '../const';
import OdcBaseEdge from '../elements/OdcBaseEdge';
import TopologyServiceBindingRequestPanel from './TopologyServiceBindingRequestPanel';

export const serviceBindingRequestPanelSupported = (selectedEntity: GraphElement) =>
  selectedEntity.getType() === TYPE_SERVICE_BINDING;

export const getServiceBindingRequestPanel = (selectedEntity: GraphElement) => {
  return <TopologyServiceBindingRequestPanel edge={selectedEntity as OdcBaseEdge} />;
};
