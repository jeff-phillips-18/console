import * as React from 'react';
import { GraphElement } from '@patternfly/react-topology';
import { TYPE_APPLICATION_GROUP } from '../../const';
import TopologyApplicationPanel from './TopologyApplicationPanel';

export const applicationPanelSupported = (selectedEntity: GraphElement) =>
  selectedEntity.getType() === TYPE_APPLICATION_GROUP;

export const getTopologyApplicationPanel = (selectedEntity: GraphElement) => {
  return <TopologyApplicationPanel selectedEntity={selectedEntity} />;
};
