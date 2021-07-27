import * as React from 'react';
import { GraphElement, Node } from '@patternfly/react-topology';
import {
  AdapterDataType,
  K8sResourceCommon,
  PodsAdapterDataType,
  ResolvedExtension,
} from '@console/dynamic-plugin-sdk';
import { Extension } from '@console/dynamic-plugin-sdk/src/types';
import { useK8sWatchResources } from '@console/internal/components/utils/k8s-watch-hook';
import {
  DeploymentConfigModel,
  DeploymentModel,
  DaemonSetModel,
  StatefulSetModel,
  JobModel,
  CronJobModel,
} from '@console/internal/models';
import {
  BuildConfigData,
  getPodsForResource,
  getResourcesToWatchForPods,
  useBuildConfigsWatcher,
  useJobsForCronJobWatcher,
  usePodsWatcher,
} from '@console/shared';
import { TYPE_WORKLOAD } from '../../const';
import { getResource } from '../../utils';

export const getDataFromAdapter = <T extends { resource: K8sResourceCommon }, E extends Extension>(
  element: GraphElement,
  [resolvedExtensions, loaded]: [ResolvedExtension<E>[], boolean],
): T | undefined =>
  loaded
    ? resolvedExtensions.reduce<T>((acc, { properties: { adapt } }) => {
        const values = (adapt as (element: GraphElement) => T)(element);
        return values ?? acc;
      }, undefined)
    : undefined;

const usePodsAdapterForWorkloads = (resource: K8sResourceCommon): PodsAdapterDataType => {
  const buildConfigsData = useBuildConfigsWatcher(resource);
  const { podData, loaded, loadError } = usePodsWatcher(resource);
  return { pods: podData?.pods, loaded, loadError, buildConfigsData };
};

export const podsAdapterForWorkloads = (
  element: GraphElement,
): AdapterDataType<PodsAdapterDataType> | undefined => {
  if (element.getType() !== TYPE_WORKLOAD) return undefined;
  const resource = getResource(element as Node);
  if (
    ![
      DeploymentConfigModel.kind,
      DeploymentModel.kind,
      DaemonSetModel.kind,
      StatefulSetModel.kind,
      JobModel.kind,
    ].includes(resource.kind)
  )
    return undefined;
  return { resource, provider: usePodsAdapterForWorkloads };
};

export const buildsAdapterForWorkloads = (
  element: GraphElement,
): AdapterDataType<BuildConfigData> | undefined => {
  if (element.getType() !== TYPE_WORKLOAD) return undefined;
  const resource = getResource(element as Node);
  if (
    ![
      DeploymentConfigModel.kind,
      DeploymentModel.kind,
      DaemonSetModel.kind,
      StatefulSetModel.kind,
      CronJobModel.kind,
    ].includes(resource.kind)
  )
    return undefined;
  return { resource, provider: useBuildConfigsWatcher };
};

export const networkAdapterForWorkloads = (element: GraphElement): AdapterDataType | undefined => {
  if (element.getType() !== TYPE_WORKLOAD) return undefined;
  const resource = getResource(element as Node);
  if (
    ![
      DeploymentConfigModel.kind,
      DeploymentModel.kind,
      DaemonSetModel.kind,
      StatefulSetModel.kind,
    ].includes(resource.kind)
  )
    return undefined;
  return { resource };
};

const usePodsAdapterForCronJobWorkloads = (resource: K8sResourceCommon): PodsAdapterDataType => {
  const { jobs } = useJobsForCronJobWatcher(resource);
  const {
    metadata: { namespace },
  } = resource;

  const [pods, setPods] = React.useState([]);
  const [loaded, setLoaded] = React.useState<boolean>(false);
  const [loadError, setLoadError] = React.useState<string>('');
  const watchedResources = React.useMemo(() => getResourcesToWatchForPods('CronJob', namespace), [
    namespace,
  ]);

  const resources = useK8sWatchResources(watchedResources);

  React.useEffect(() => {
    const errorKey = Object.keys(resources).find((key) => resources[key].loadError);
    if (errorKey) {
      setLoadError(resources[errorKey].loadError);
      return;
    }
    setLoadError('');
    if (
      Object.keys(resources).length > 0 &&
      Object.keys(resources).every((key) => resources[key].loaded)
    ) {
      const updatedPods = jobs?.length
        ? jobs.reduce((acc, res) => {
            acc.push(...getPodsForResource(res, resources));
            return acc;
          }, [])
        : [];
      setPods(updatedPods);
      setLoaded(true);
    }
  }, [jobs, resources]);
  return { pods, loaded, loadError };
};

export const podsAdapterForCronJobWorkload = (
  element: GraphElement,
): AdapterDataType<PodsAdapterDataType> | undefined => {
  if (element.getType() !== TYPE_WORKLOAD) return undefined;
  const resource = getResource(element as Node);
  if (resource.kind !== CronJobModel.kind) return undefined;
  return { resource, provider: usePodsAdapterForCronJobWorkloads };
};
