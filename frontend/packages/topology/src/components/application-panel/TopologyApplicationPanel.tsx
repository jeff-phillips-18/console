import * as React from 'react';
import { ResourceIcon, ActionsMenu } from '@console/internal/components/utils';
import { groupActions } from '../../actions/groupActions';
import TopologyApplicationResources from './TopologyApplicationResources';
import { GraphElement } from '@patternfly/react-topology';

type TopologyApplicationPanelProps = {
  selectedEntity: GraphElement;
};

const TopologyApplicationPanel: React.FC<TopologyApplicationPanelProps> = ({ selectedEntity }) => {
  const graphData = selectedEntity.getGraph().getData();
  const application = {
    id: selectedEntity.getId(),
    name: selectedEntity.getLabel(),
    resources: selectedEntity.getData().groupResources,
  };

  return (
    <div className="overview__sidebar-pane resource-overview">
      <div className="overview__sidebar-pane-head resource-overview__heading">
        <h1 className="co-m-pane__heading">
          <div className="co-m-pane__name co-resource-item">
            <ResourceIcon className="co-m-resource-icon--lg" kind="application" />
            {application.name}
          </div>
          <div className="co-actions">
            <ActionsMenu actions={groupActions(graphData, application)} />
          </div>
        </h1>
      </div>
      <TopologyApplicationResources resources={application.resources} group={application.name} />
    </div>
  );
};

export default TopologyApplicationPanel;
