import * as React from 'react';
import {
  GraphElement,
  BaseEdge,
  isEdge,
  isNode,
  observer,
  TopologySideBar as PFTopologySideBar,
  Visualization,
} from '@patternfly/react-topology';
import { CloseButton } from '@console/internal/components/utils';
import TopologyEdgePanel from './TopologyEdgePanel';
import TopologyResourcePanel from './TopologyResourcePanel';
import { useResolvedExtensions } from '@console/dynamic-plugin-sdk/src/api/useResolvedExtensions';
import { isTopologySidePanelProvider, TopologySidePanelProvider } from '../../extensions';

type TopologySideBarProps = {
  show: boolean;
  onClose: () => void;
};

const TopologySideBar: React.FC<TopologySideBarProps> = ({ children, show, onClose }) => (
  <PFTopologySideBar show={show}>
    <div className="co-sidebar-dismiss clearfix">
      <CloseButton onClick={onClose} data-test-id="sidebar-close-button" />
    </div>
    {children}
  </PFTopologySideBar>
);

export type SelectedItemDetailsProps = {
  selectedEntity: GraphElement;
};

const SelectedItemDetails: React.FC<SelectedItemDetailsProps> = observer(({ selectedEntity }) => {
  const [extensionSidePanels, extensionSidePanelsResolved] = useResolvedExtensions<
    TopologySidePanelProvider
  >(isTopologySidePanelProvider);
  if (!selectedEntity || !extensionSidePanelsResolved) {
    return null;
  }
  const sidePanel = extensionSidePanels
    .filter((extensionSidePanel) => extensionSidePanel.properties.supportsEntity(selectedEntity))
    .sort((a, b) => a.properties.priority - b.properties.priority)[0];

  if (sidePanel) {
    return sidePanel.properties.sidePanel(selectedEntity);
  }

  if (isNode(selectedEntity)) {
    return <TopologyResourcePanel selectedEntity={selectedEntity} />;
  }
  if (isEdge(selectedEntity)) {
    return <TopologyEdgePanel edge={selectedEntity as BaseEdge} />;
  }

  return null;
});

export const getTopologySideBar = (
  visualization: Visualization,
  selectedEntity: GraphElement,
  onClose: () => void,
): { sidebar: React.ReactElement; shown: boolean } => {
  const details = selectedEntity ? <SelectedItemDetails selectedEntity={selectedEntity} /> : null;
  return {
    sidebar: (
      <TopologySideBar show={!!details} onClose={onClose}>
        {details}
      </TopologySideBar>
    ),
    shown: !!details,
  };
};

export default TopologySideBar;
