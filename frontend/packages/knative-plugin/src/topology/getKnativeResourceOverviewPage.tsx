import * as React from 'react';
import { GraphElement } from '@patternfly/react-topology';
import KnativeResourceOverviewPage from '../components/overview/KnativeResourceOverviewPage';
import { TYPE_EVENT_PUB_SUB_LINK } from './const';

export const knativeResourceOverviewPageSupported = (selectedEntity: GraphElement) => {
  const item = selectedEntity.getData();
  const itemKind = item?.resource?.kind ?? null;
  return (
    (item?.data?.isKnativeResource && itemKind && itemKind !== 'Deployment') ||
    selectedEntity.getType() === TYPE_EVENT_PUB_SUB_LINK
  );
};

export const getKnativeResourceOverviewPage = (selectedEntity: GraphElement) => {
  const item = selectedEntity.getData().resources;
  return <KnativeResourceOverviewPage item={item} />;
};
