import * as React from 'react';
import { ResourceOverviewPage } from '@console/internal/components/overview/resource-overview-page';
import { GraphElement } from '@patternfly/react-topology';

export type TopologyResourcePanelProps = {
  selectedEntity: GraphElement;
};

const TopologyHelmWorkloadPanel: React.FC<TopologyResourcePanelProps> = ({ selectedEntity }) => {
  const item = selectedEntity.getData();
  const resourceItemToShowOnSideBar = item && item.resources;

  return (
    resourceItemToShowOnSideBar && (
      <ResourceOverviewPage
        item={resourceItemToShowOnSideBar}
        kind={resourceItemToShowOnSideBar.obj.kind}
      />
    )
  );
};

export default TopologyHelmWorkloadPanel;
