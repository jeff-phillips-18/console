import * as React from 'react';
import { Node } from '@patternfly/react-topology';
import { ResourceOverviewPage } from '@console/internal/components/overview/resource-overview-page';
import { ModifyApplication } from '../../actions/modify-application';

type TopologyResourcePanelProps = {
  selectedEntity: Node;
};

const TopologyResourcePanel: React.FC<TopologyResourcePanelProps> = ({ selectedEntity }) => {
  const item = selectedEntity.getData();
  const resourceItemToShowOnSideBar = item && item.resources;
  if (!resourceItemToShowOnSideBar) {
    return null;
  }

  const customActions = [ModifyApplication];

  return (
    <ResourceOverviewPage
      item={resourceItemToShowOnSideBar}
      kind={resourceItemToShowOnSideBar.obj.kind}
      customActions={customActions}
    />
  );
};

export default TopologyResourcePanel;
