import * as React from 'react';
import { GraphElement, Node } from '@patternfly/react-topology';
import { TYPE_HELM_RELEASE } from './components/const';
import TopologyHelmReleasePanel from './TopologyHelmReleasePanel';

export const helmReleasePanelSupported = (selectedEntity: GraphElement) =>
  selectedEntity.getType() === TYPE_HELM_RELEASE;

export const getHelmReleasePanel = (selectedEntity: GraphElement) => (
  <TopologyHelmReleasePanel helmRelease={selectedEntity as Node} />
);
