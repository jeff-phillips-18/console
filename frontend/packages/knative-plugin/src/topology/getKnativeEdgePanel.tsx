import * as React from 'react';
import { Edge, GraphElement } from '@patternfly/react-topology';
import KnativeTopologyEdgePanel from '../components/overview/KnativeTopologyEdgePanel';
import { TYPE_REVISION_TRAFFIC, TYPE_EVENT_SOURCE_LINK } from './const';

export const knativeEdgePanelSupported = (selectedEntity: GraphElement) =>
  [TYPE_REVISION_TRAFFIC, TYPE_EVENT_SOURCE_LINK].includes(selectedEntity.getType());

export const getKnativeEdgePanel = (selectedEntity: GraphElement) => {
  return <KnativeTopologyEdgePanel edge={selectedEntity as Edge} />;
};
