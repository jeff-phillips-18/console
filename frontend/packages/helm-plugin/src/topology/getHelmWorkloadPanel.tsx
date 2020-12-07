import * as React from 'react';
import { GraphElement } from '@patternfly/react-topology';
import { TYPE_HELM_WORKLOAD } from './components/const';
import TopologyHelmWorkloadPanel from './TopologyHelmWorkloadPanel';

export const helmWorkloadPanelSupported = (selectedEntity: GraphElement) =>
  selectedEntity.getType() === TYPE_HELM_WORKLOAD;

export const getHelmWorkloadPanel = (selectedEntity: GraphElement) => (
  <TopologyHelmWorkloadPanel selectedEntity={selectedEntity} />
);
