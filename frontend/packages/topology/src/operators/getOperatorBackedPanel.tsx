import * as React from 'react';
import { GraphElement } from '@patternfly/react-topology';
import TopologyOperatorBackedPanel from './TopologyOperatorBackedPanel';
import { TYPE_OPERATOR_BACKED_SERVICE } from './components/const';

export const operatorBackedPanelSupported = (selectedEntity: GraphElement) =>
  selectedEntity.getType() === TYPE_OPERATOR_BACKED_SERVICE;

export const getOperatorBackedPanel = (selectedEntity: GraphElement) => {
  const item = selectedEntity.getData();
  return <TopologyOperatorBackedPanel item={item} />;
};
