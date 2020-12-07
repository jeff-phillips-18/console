import * as React from 'react';
import { GraphElement } from '@patternfly/react-topology';
import TopologyVmPanel from './TopologyVmPanel';
import { TYPE_VIRTUAL_MACHINE } from './components/const';
import { VMNode } from './types';

export const vmPanelSupported = (selectedEntity: GraphElement) =>
  selectedEntity.getType() === TYPE_VIRTUAL_MACHINE;

export const getVmPanel = (selectedEntity: GraphElement) => {
  return <TopologyVmPanel vmNode={selectedEntity as VMNode} />;
};
