import * as React from 'react';
import {
  Alert,
  Button,
  Card,
  CardBody,
  CardFooter,
  Popover,
  CardTitle,
} from '@patternfly/react-core';
import { AddCircleOIcon, PencilAltIcon } from '@patternfly/react-icons';
import { sortable, wrappable } from '@patternfly/react-table';
import * as classNames from 'classnames';
import * as _ from 'lodash';
import { Helmet } from 'react-helmet';
import { Trans, useTranslation } from 'react-i18next';
import { Link, match as RouterMatch, useParams } from 'react-router-dom';
import {
  WatchK8sResource,
  ResourceStatus,
  StatusIconAndText,
  useAccessReviewAllowed,
  useAccessReview,
} from '@console/dynamic-plugin-sdk';
import { getGroupVersionKindForModel } from '@console/dynamic-plugin-sdk/src/lib-core';
import { Conditions, ConditionTypes } from '@console/internal/components/conditions';
import { ResourceEventStream } from '@console/internal/components/events';
import {
  DetailsPage,
  Table,
  TableData,
  MultiListPage,
  RowFunctionArgs,
  Flatten,
} from '@console/internal/components/factory';
import {
  AsyncComponent,
  DOC_URL_OPERATORFRAMEWORK_SDK,
  documentationURLs,
  ExternalLink,
  FirehoseResult,
  getDocumentationURL,
  Kebab,
  KebabAction,
  KebabOption,
  MsgBox,
  navFactory,
  Page,
  RequireCreatePermission,
  ResourceKebab,
  ResourceLink,
  resourceObjPath,
  resourcePathFromModel,
  ResourceSummary,
  ScrollToTopOnMount,
  SectionHeading,
  StatusBox,
  Timestamp,
} from '@console/internal/components/utils';
import { getBreadcrumbPath } from '@console/internal/components/utils/breadcrumbs';
import { useK8sWatchResource } from '@console/internal/components/utils/k8s-watch-hook';
import { ConsoleOperatorConfigModel } from '@console/internal/models';
import {
  referenceForModel,
  referenceFor,
  k8sKill,
  k8sPatch,
  k8sGet,
  K8sResourceCommon,
  K8sResourceKind,
} from '@console/internal/module/k8s';
import { ALL_NAMESPACES_KEY, Status, getNamespace } from '@console/shared';
import { withFallback } from '@console/shared/src/components/error';
import { consolePluginModal } from '@console/shared/src/components/modals';
import { RedExclamationCircleIcon } from '@console/shared/src/components/status/icons';
import { CONSOLE_OPERATOR_CONFIG_NAME } from '@console/shared/src/constants';
import { useActiveNamespace } from '@console/shared/src/hooks/redux-selectors';
import { useK8sModel } from '@console/shared/src/hooks/useK8sModel';
import { RouteParams } from '@console/shared/src/types';
import { isPluginEnabled } from '@console/shared/src/utils';
import { GLOBAL_OPERATOR_NAMESPACES, GLOBAL_COPIED_CSV_NAMESPACE } from '../const';
import {
  ClusterServiceVersionModel,
  SubscriptionModel,
  PackageManifestModel,
  CatalogSourceModel,
  InstallPlanModel,
  OperatorGroupModel,
} from '../models';
import { subscriptionForCSV, getSubscriptionStatus } from '../status/csv-status';
import {
  APIServiceDefinition,
  CatalogSourceKind,
  ClusterServiceVersionKind,
  ClusterServiceVersionPhase,
  CRDDescription,
  CSVConditionReason,
  SubscriptionKind,
} from '../types';
import {
  getClusterServiceVersionPlugins,
  isCatalogSourceTrusted,
  upgradeRequiresApproval,
} from '../utils';
import { isCopiedCSV, isStandaloneCSV } from '../utils/clusterserviceversions';
import { useClusterServiceVersion } from '../utils/useClusterServiceVersion';
import { useClusterServiceVersionPath } from '../utils/useClusterServiceVersionPath';
import { createUninstallOperatorModal } from './modals/uninstall-operator-modal';
import { ProvidedAPIsPage, ProvidedAPIPage, ProvidedAPIPageProps } from './operand';
import { operatorGroupFor, operatorNamespaceFor, targetNamespacesFor } from './operator-group';
import { CreateInitializationResourceButton } from './operator-install-page';
import {
  SourceMissingStatus,
  SubscriptionDetails,
  SubscriptionDetailsProps,
  UpgradeApprovalLink,
  catalogSourceForSubscription,
} from './subscription';
import { ClusterServiceVersionLogo, referenceForProvidedAPI, providedAPIsForCSV } from './index';

const isSubscription = (obj) => referenceFor(obj) === referenceForModel(SubscriptionModel);
const isCSV = (obj): obj is ClusterServiceVersionKind =>
  referenceFor(obj) === referenceForModel(ClusterServiceVersionModel);
const isPackageServer = (obj) =>
  obj.metadata.name === 'packageserver' &&
  obj.metadata.namespace === 'openshift-operator-lifecycle-manager';

const nameColumnClass = '';
const namespaceColumnClass = '';
const managedNamespacesColumnClass = classNames('pf-m-hidden', 'pf-m-visible-on-sm');
const statusColumnClass = classNames('pf-m-hidden', 'pf-m-visible-on-lg');
const lastUpdatedColumnClass = classNames('pf-m-hidden', 'pf-m-visible-on-2xl');
const providedAPIsColumnClass = classNames('pf-m-hidden', 'pf-m-visible-on-xl');

const editSubscription = (sub: SubscriptionKind): KebabOption =>
  !_.isNil(sub)
    ? {
        // t('olm~Edit Subscription')
        labelKey: 'olm~Edit Subscription',
        href: `${resourcePathFromModel(
          SubscriptionModel,
          sub.metadata.name,
          sub.metadata.namespace,
        )}/yaml`,
      }
    : null;

const uninstall = (sub: SubscriptionKind, csv?: ClusterServiceVersionKind): KebabOption =>
  !_.isNil(sub)
    ? {
        // t('olm~Uninstall Operator')
        labelKey: 'olm~Uninstall Operator',
        callback: () =>
          createUninstallOperatorModal({
            k8sKill,
            k8sGet,
            k8sPatch,
            subscription: sub,
            csv,
            blocking: true,
          }),
        accessReview: {
          group: SubscriptionModel.apiGroup,
          resource: SubscriptionModel.plural,
          name: sub.metadata.name,
          namespace: sub.metadata.namespace,
          verb: 'delete',
        },
      }
    : null;

const menuActionsForCSV = (
  csv: ClusterServiceVersionKind,
  subscription: SubscriptionKind,
): KebabAction[] => {
  return _.isEmpty(subscription)
    ? [Kebab.factory.Delete]
    : [() => editSubscription(subscription), () => uninstall(subscription, csv)];
};

const SubscriptionStatus: React.FC<{ muted?: boolean; subscription: SubscriptionKind }> = ({
  muted = false,
  subscription,
}) => {
  const { t } = useTranslation();
  if (!subscription) {
    return null;
  }

  if (upgradeRequiresApproval(subscription)) {
    return <UpgradeApprovalLink subscription={subscription} />;
  }

  const subscriptionStatus = getSubscriptionStatus(subscription);
  return (
    <span className={muted ? 'text-muted' : 'co-icon-and-text'}>
      {muted ? (
        subscriptionStatus.title
      ) : (
        <Status status={subscriptionStatus.status || t('olm~Unknown')} />
      )}
    </span>
  );
};

const ClusterServiceVersionStatus: React.FC<ClusterServiceVersionStatusProps> = ({
  obj,
  subscription,
}) => {
  const status = obj?.status?.phase;
  if (obj.metadata.deletionTimestamp) {
    return (
      <span className="co-icon-and-text">
        <Status status={ClusterServiceVersionPhase.CSVPhaseDeleting} />
      </span>
    );
  }
  return status ? (
    <>
      <span className="co-icon-and-text">
        <Status status={status} />
      </span>
      <SubscriptionStatus muted subscription={subscription} />
    </>
  ) : null;
};

const ManagedNamespaces: React.FC<ManagedNamespacesProps> = ({ obj }) => {
  const { t } = useTranslation();
  const managedNamespaces = targetNamespacesFor(obj)?.split(',') || [];
  if (isCopiedCSV(obj)) {
    return (
      <>
        <ResourceLink
          kind="Namespace"
          title={obj.metadata.namespace}
          name={obj.metadata.namespace}
        />
        <span className="text-muted">{obj.status.message}</span>
      </>
    );
  }

  switch (managedNamespaces.length) {
    case 0:
      return t('olm~All Namespaces');
    case 1:
      return managedNamespaces[0] ? (
        <ResourceLink kind="Namespace" title={managedNamespaces[0]} name={managedNamespaces[0]} />
      ) : (
        t('olm~All Namespaces')
      );
    default:
      return (
        <Popover
          headerContent={t('olm~Managed Namespaces')}
          bodyContent={managedNamespaces.map((namespace) => (
            <ResourceLink kind="Namespace" title={namespace} name={namespace} />
          ))}
        >
          <Button variant="link" isInline>
            {t('olm~{{count}} Namespaces', { count: managedNamespaces.length })}
          </Button>
        </Popover>
      );
  }
};

const ConsolePlugins: React.FC<ConsolePluginsProps> = ({ csvPlugins, trusted }) => {
  const console: WatchK8sResource = {
    kind: referenceForModel(ConsoleOperatorConfigModel),
    isList: false,
    name: CONSOLE_OPERATOR_CONFIG_NAME,
  };
  const [consoleOperatorConfig] = useK8sWatchResource<K8sResourceKind>(console);
  const { t } = useTranslation();
  const [canPatchConsoleOperatorConfig] = useAccessReview({
    group: ConsoleOperatorConfigModel.apiGroup,
    resource: ConsoleOperatorConfigModel.plural,
    verb: 'patch',
    name: CONSOLE_OPERATOR_CONFIG_NAME,
  });
  const csvPluginsCount = csvPlugins.length;

  return (
    <>
      {consoleOperatorConfig && canPatchConsoleOperatorConfig && (
        <dl className="co-clusterserviceversion-details__field">
          <dt>{t('olm~Console plugin', { count: csvPluginsCount })}</dt>
          {csvPlugins.map((plugin) => (
            <dd key={plugin} className="co-clusterserviceversion-details__field-description">
              {csvPluginsCount > 1 && (
                <strong className="text-muted">{t('olm~{{plugin}}:', { plugin })} </strong>
              )}
              <Button
                data-test="edit-console-plugin"
                type="button"
                isInline
                onClick={() =>
                  consolePluginModal({
                    consoleOperatorConfig,
                    csvPluginsCount,
                    plugin,
                    trusted,
                  })
                }
                variant="link"
              >
                <>
                  {isPluginEnabled(consoleOperatorConfig, plugin)
                    ? t('olm~Enabled')
                    : t('olm~Disabled')}{' '}
                  <PencilAltIcon className="co-icon-space-l pf-v5-c-button-icon--plain" />
                </>
              </Button>
            </dd>
          ))}
        </dl>
      )}
    </>
  );
};

const ConsolePluginStatus: React.FC<ConsolePluginStatusProps> = ({ csv, csvPlugins }) => {
  const console: WatchK8sResource = {
    kind: referenceForModel(ConsoleOperatorConfigModel),
    isList: false,
    name: CONSOLE_OPERATOR_CONFIG_NAME,
  };
  const [consoleOperatorConfig] = useK8sWatchResource<K8sResourceKind>(console);
  const { t } = useTranslation();
  const [canPatchConsoleOperatorConfig] = useAccessReview({
    group: ConsoleOperatorConfigModel.apiGroup,
    resource: ConsoleOperatorConfigModel.plural,
    verb: 'patch',
    name: CONSOLE_OPERATOR_CONFIG_NAME,
  });
  const aPluginIsDisabled =
    !consoleOperatorConfig?.spec?.plugins?.length ||
    csvPlugins.some((plugin) => !isPluginEnabled(consoleOperatorConfig, plugin));

  return (
    consoleOperatorConfig &&
    canPatchConsoleOperatorConfig &&
    aPluginIsDisabled && (
      <Popover
        headerContent={<div>{t('olm~Console plugin available')}</div>}
        bodyContent={
          <div>
            <p>
              {t(
                'olm~To let this operator provide a custom interface and run its own code in your console, enable its console plugin in the operator details.',
              )}
            </p>
            <Link to={resourceObjPath(csv, referenceFor(csv))}>
              {t('olm~View operator details')}
            </Link>
          </div>
        }
      >
        <Button variant="link" isInline>
          {t('olm~Plugin available')}
        </Button>
      </Popover>
    )
  );
};

export const ClusterServiceVersionTableRow = withFallback<ClusterServiceVersionTableRowProps>(
  ({ activeNamespace, obj, subscription, catalogSourceMissing }) => {
    const { displayName, provider, version } = obj.spec ?? {};
    const { t } = useTranslation();
    const olmOperatorNamespace = operatorNamespaceFor(obj) ?? '';
    const [icon] = obj.spec.icon ?? [];
    const route = useClusterServiceVersionPath(obj);
    const providedAPIs = providedAPIsForCSV(obj);
    const csvPlugins = getClusterServiceVersionPlugins(obj?.metadata?.annotations);

    return (
      <>
        {/* Name */}
        <TableData className={nameColumnClass}>
          <Link
            to={route}
            className="co-clusterserviceversion-link"
            data-test-operator-row={displayName}
          >
            <ClusterServiceVersionLogo
              icon={icon}
              displayName={displayName}
              version={version}
              provider={provider}
            />
          </Link>
        </TableData>

        {/* Operator Namespace */}
        {activeNamespace === ALL_NAMESPACES_KEY ? (
          <TableData className={namespaceColumnClass}>
            <ResourceLink
              kind="Namespace"
              title={olmOperatorNamespace}
              name={olmOperatorNamespace}
            />
          </TableData>
        ) : null}

        {/* Managed Namespaces */}
        <TableData className={managedNamespacesColumnClass}>
          <ManagedNamespaces obj={obj} />
        </TableData>

        {/* Status */}
        <TableData className={statusColumnClass}>
          <div className="co-clusterserviceversion-row__status">
            {catalogSourceMissing ? (
              <SourceMissingStatus />
            ) : (
              <ClusterServiceVersionStatus obj={obj} subscription={subscription} />
            )}
          </div>
          {csvPlugins.length > 0 && <ConsolePluginStatus csv={obj} csvPlugins={csvPlugins} />}
        </TableData>

        {/* Last Updated */}
        <TableData className={lastUpdatedColumnClass}>
          {obj.status == null ? '-' : <Timestamp timestamp={obj.status.lastUpdateTime} />}
        </TableData>

        {/* Provided APIs */}
        <TableData className={providedAPIsColumnClass}>
          {!_.isEmpty(providedAPIs)
            ? _.take(providedAPIs, 4).map((desc) => (
                <div key={referenceForProvidedAPI(desc)}>
                  <Link to={`${route}/${referenceForProvidedAPI(desc)}`} title={desc.name}>
                    {desc.displayName || desc.kind}
                  </Link>
                </div>
              ))
            : '-'}
          {providedAPIs.length > 4 && (
            <Link
              to={route}
              title={t('olm~View {{numAPIs}} more...', { numAPIs: providedAPIs.length - 4 })}
            >
              {t('olm~View {{numAPIs}} more...', { numAPIs: providedAPIs.length - 4 })}
            </Link>
          )}
        </TableData>

        {/* Kebab */}
        <TableData className={Kebab.columnClass}>
          <ResourceKebab
            resource={obj}
            kind={referenceFor(obj)}
            actions={menuActionsForCSV(obj, subscription)}
          />
        </TableData>
      </>
    );
  },
);

export const SubscriptionTableRow: React.FC<SubscriptionTableRowProps> = ({
  activeNamespace,
  catalogSourceMissing,
  obj,
}) => {
  const { t } = useTranslation();
  const csvName = obj?.spec?.name;
  const menuActions = [Kebab.factory.Edit, () => uninstall(obj)];
  const namespace = getNamespace(obj);
  const route = resourceObjPath(obj, referenceForModel(SubscriptionModel));

  return (
    <>
      {/* Name */}
      <TableData className={nameColumnClass}>
        <Link to={route}>
          <ClusterServiceVersionLogo
            icon={null}
            displayName={csvName}
            version={null}
            provider={null}
          />
        </Link>
      </TableData>

      {/* Operator Namespace */}
      {activeNamespace === ALL_NAMESPACES_KEY ? (
        <TableData className={namespaceColumnClass}>
          <ResourceLink kind="Namespace" title={namespace} name={namespace} />
        </TableData>
      ) : null}

      {/* Managed Namespaces */}
      <TableData className={managedNamespacesColumnClass}>
        <span className="text-muted">{t('olm~None')}</span>
      </TableData>

      {/* Status */}
      <TableData className={statusColumnClass}>
        {catalogSourceMissing ? <SourceMissingStatus /> : <SubscriptionStatus subscription={obj} />}
      </TableData>

      {/* Last Updated */}
      <TableData className={lastUpdatedColumnClass}>
        {obj.status == null ? '-' : <Timestamp timestamp={obj.status.lastUpdated} />}
      </TableData>

      {/* Provided APIs */}
      <TableData className={providedAPIsColumnClass}>
        <span className="text-muted">{t('olm~None')}</span>
      </TableData>

      {/* Kebab */}
      <TableData className={Kebab.columnClass}>
        <ResourceKebab resource={obj} kind={referenceFor(obj)} actions={menuActions} />
      </TableData>
    </>
  );
};

const InstalledOperatorTableRow: React.FC<InstalledOperatorTableRowProps> = ({
  obj,
  customData,
}) => {
  const { catalogSources, subscriptions, activeNamespace } = customData;
  const subscription = isCSV(obj)
    ? subscriptionForCSV(subscriptions, obj as ClusterServiceVersionKind)
    : (obj as SubscriptionKind);
  // Only warn about missing catalog sources if the user was able to list them
  // but exclude PackageServer as it does not have a subscription.
  const catalogSourceMissing =
    !_.isEmpty(catalogSources) &&
    !catalogSourceForSubscription(catalogSources, subscription) &&
    !isPackageServer(obj);

  return isCSV(obj) ? (
    <ClusterServiceVersionTableRow
      activeNamespace={activeNamespace}
      catalogSourceMissing={catalogSourceMissing}
      obj={obj as ClusterServiceVersionKind}
      subscription={subscription}
    />
  ) : (
    <SubscriptionTableRow
      activeNamespace={activeNamespace}
      catalogSourceMissing={catalogSourceMissing}
      obj={subscription as SubscriptionKind}
    />
  );
};

const CSVListEmptyMsg = () => {
  const { t } = useTranslation();
  return <MsgBox title={t('olm~No Operators found')} />;
};

const CSVListNoDataEmptyMsg = () => {
  const { t } = useTranslation();
  const project = useActiveNamespace();
  const noOperatorsInSingleNamespaceMessage = t(
    'olm~No Operators are available for project {{project}}.',
    { project },
  );
  const noOperatorsInAllNamespacesMessage = t('olm~No Operators are available.');
  const detail = (
    <>
      <div>
        {project === ALL_NAMESPACES_KEY
          ? noOperatorsInAllNamespacesMessage
          : noOperatorsInSingleNamespaceMessage}
      </div>
      <div>
        <Trans ns="olm">
          Discover and install Operators from the <a href="/operatorhub">OperatorHub</a>.
        </Trans>
      </div>
    </>
  );
  return <MsgBox title={t('olm~No Operators found')} detail={detail} />;
};

export const ClusterServiceVersionList: React.FC<ClusterServiceVersionListProps> = ({
  subscriptions,
  catalogSources,
  data,
  ...rest
}) => {
  const { t } = useTranslation();
  const activeNamespace = useActiveNamespace();
  const nameHeader: Header = {
    title: t('olm~Name'),
    sortField: 'metadata.name',
    transforms: [sortable],
    props: { className: nameColumnClass },
  };

  const namespaceHeader: Header = {
    title: t('olm~Namespace'),
    sortFunc: 'getOperatorNamespace',
    transforms: [sortable],
    props: { className: namespaceColumnClass },
  };

  const managedNamespacesHeader: Header = {
    title: t('olm~Managed Namespaces'),
    sortFunc: 'formatTargetNamespaces',
    transforms: [sortable, wrappable],
    props: { className: managedNamespacesColumnClass },
  };

  const statusHeader: Header = {
    title: t('olm~Status'),
    props: { className: statusColumnClass },
  };

  const lastUpdatedHeader: Header = {
    title: t('olm~Last updated'),
    props: { className: lastUpdatedColumnClass },
  };

  const providedAPIsHeader: Header = {
    title: t('olm~Provided APIs'),
    props: { className: providedAPIsColumnClass },
  };

  const kebabHeader: Header = {
    title: '',
    props: { className: Kebab.columnClass },
  };

  const AllProjectsTableHeader = (): Header[] => [
    nameHeader,
    namespaceHeader,
    managedNamespacesHeader,
    statusHeader,
    lastUpdatedHeader,
    providedAPIsHeader,
    kebabHeader,
  ];

  const SingleProjectTableHeader = (): Header[] => [
    nameHeader,
    managedNamespacesHeader,
    statusHeader,
    lastUpdatedHeader,
    providedAPIsHeader,
    kebabHeader,
  ];

  const filterOperators = (
    operators: (ClusterServiceVersionKind | SubscriptionKind)[],
    allNamespaceActive: boolean,
  ): (ClusterServiceVersionKind | SubscriptionKind)[] => {
    return operators.filter((operator) => {
      if (isSubscription(operator)) {
        return true;
      }
      if (allNamespaceActive) {
        return !isCopiedCSV(operator) && isStandaloneCSV(operator);
      }

      if (
        window.SERVER_FLAGS.copiedCSVsDisabled &&
        operator.metadata.namespace === GLOBAL_COPIED_CSV_NAMESPACE &&
        activeNamespace !== GLOBAL_COPIED_CSV_NAMESPACE
      ) {
        return isCopiedCSV(operator) && isStandaloneCSV(operator);
      }
      return isStandaloneCSV(operator);
    });
  };

  const formatTargetNamespaces = (obj: ClusterServiceVersionKind | SubscriptionKind): string => {
    if (obj.kind === 'Subscription') {
      return t('olm~None');
    }

    if (isCopiedCSV(obj)) {
      return obj.metadata.namespace;
    }

    const targetNamespaces = targetNamespacesFor(obj)?.split(',') ?? [];
    switch (targetNamespaces.length) {
      case 0:
        return t('olm~All Namespaces');
      case 1:
        return targetNamespaces[0];
      default:
        return t('olm~{{count}} Namespaces', { count: targetNamespaces.length });
    }
  };

  const getOperatorNamespace = (
    obj: ClusterServiceVersionKind | SubscriptionKind,
  ): string | null => {
    const olmOperatorNamespace = operatorNamespaceFor(obj);
    return olmOperatorNamespace ?? getNamespace(obj);
  };
  const allNamespaceActive = activeNamespace === ALL_NAMESPACES_KEY;

  const customData = React.useMemo(
    () => ({
      catalogoperators: catalogSources?.data ?? [],
      subscriptions: subscriptions?.data ?? [],
      activeNamespace,
    }),
    [activeNamespace, catalogSources, subscriptions],
  );

  return (
    <div className="co-installed-operators">
      <Table
        data={filterOperators(data, allNamespaceActive)}
        {...rest}
        aria-label={t('olm~Installed Operators')}
        Header={allNamespaceActive ? AllProjectsTableHeader : SingleProjectTableHeader}
        Row={InstalledOperatorTableRow}
        EmptyMsg={CSVListEmptyMsg}
        NoDataEmptyMsg={CSVListNoDataEmptyMsg}
        virtualize
        customData={customData}
        customSorts={{
          formatTargetNamespaces,
          getOperatorNamespace,
        }}
      />
    </div>
  );
};

export const ClusterServiceVersionsPage: React.FC<ClusterServiceVersionsPageProps> = (props) => {
  const { t } = useTranslation();
  const [canListAllSubscriptions] = useAccessReview({
    group: SubscriptionModel.apiGroup,
    resource: SubscriptionModel.plural,
    verb: 'list',
  });
  const title = t('olm~Installed Operators');
  const olmURL = getDocumentationURL(documentationURLs.operators);
  const helpText = (
    <Trans ns="olm">
      Installed Operators are represented by ClusterServiceVersions within this Namespace. For more
      information, see the{' '}
      <ExternalLink href={olmURL}>Understanding Operators documentation</ExternalLink>. Or create an
      Operator and ClusterServiceVersion using the{' '}
      <ExternalLink href={DOC_URL_OPERATORFRAMEWORK_SDK}>Operator SDK</ExternalLink>.
    </Trans>
  );

  const flatten: Flatten<{
    globalClusterServiceVersions: ClusterServiceVersionKind[];
    clusterServiceVersions: ClusterServiceVersionKind[];
    subscriptions: SubscriptionKind[];
  }> = ({ globalClusterServiceVersions, clusterServiceVersions, subscriptions }) =>
    [
      ...(globalClusterServiceVersions?.data ?? []),
      ...(clusterServiceVersions?.data ?? []),
      ...(subscriptions?.data ?? []).filter(
        (sub) =>
          ['', sub.metadata.namespace].includes(props.namespace || '') &&
          _.isNil(_.get(sub, 'status.installedCSV')),
      ),
    ].filter(
      (obj, i, all) =>
        isCSV(obj) ||
        _.isUndefined(
          all.find(({ metadata }) =>
            [obj?.status?.currentCSV, obj?.spec?.startingCSV].includes(metadata?.name),
          ),
        ),
    );

  return (
    <>
      <Helmet>
        <title>{title}</title>
      </Helmet>
      <MultiListPage
        {...props}
        resources={[
          ...(!GLOBAL_OPERATOR_NAMESPACES.includes(props.namespace) &&
          window.SERVER_FLAGS.copiedCSVsDisabled
            ? [
                {
                  kind: referenceForModel(ClusterServiceVersionModel),
                  namespace: GLOBAL_COPIED_CSV_NAMESPACE,
                  prop: 'globalClusterServiceVersions',
                },
              ]
            : []),
          {
            kind: referenceForModel(ClusterServiceVersionModel),
            namespace: props.namespace,
            prop: 'clusterServiceVersions',
          },
          {
            kind: referenceForModel(SubscriptionModel),
            prop: 'subscriptions',
            namespace: canListAllSubscriptions ? undefined : props.namespace,
            optional: true,
          },
          {
            kind: referenceForModel(CatalogSourceModel),
            prop: 'catalogSources',
            optional: true,
          },
        ]}
        title={title}
        flatten={flatten}
        namespace={props.namespace}
        ListComponent={ClusterServiceVersionList}
        helpText={helpText}
        textFilter="cluster-service-version"
      />
    </>
  );
};

export const MarkdownView = (props: {
  content: string;
  styles?: string;
  exactHeight?: boolean;
  truncateContent?: boolean;
}) => {
  return (
    <AsyncComponent
      loader={() =>
        import('@console/internal/components/markdown-view').then((c) => c.SyncMarkdownView)
      }
      {...props}
    />
  );
};

export const CRDCard: React.FC<CRDCardProps> = ({ csv, crd, required, ...rest }) => {
  const { t } = useTranslation();
  const reference = referenceForProvidedAPI(crd);
  const [model] = useK8sModel(reference);
  const canCreate = rest.canCreate ?? model?.verbs?.includes?.('create');
  const createRoute = React.useMemo(
    () =>
      csv
        ? `/k8s/ns/${csv.metadata.namespace}/${ClusterServiceVersionModel.plural}/${csv.metadata.name}/${reference}/~new`
        : null,
    [csv, reference],
  );

  return (
    <Card>
      <CardTitle>
        <span className="co-resource-item">
          <ResourceLink
            kind={referenceForProvidedAPI(crd)}
            title={crd.name}
            linkTo={false}
            displayName={crd.displayName || crd.kind}
          />
          {required && (
            <ResourceStatus badgeAlt>
              <StatusIconAndText icon={<RedExclamationCircleIcon />} title={t('olm~Required')} />
            </ResourceStatus>
          )}
        </span>
      </CardTitle>
      <CardBody>
        <MarkdownView content={crd.description} truncateContent />
      </CardBody>
      {canCreate && createRoute && (
        <RequireCreatePermission model={model} namespace={csv.metadata.namespace}>
          <CardFooter>
            <Link to={createRoute}>
              <AddCircleOIcon className="co-icon-space-r" />
              {t('olm~Create instance')}
            </Link>
          </CardFooter>
        </RequireCreatePermission>
      )}
    </Card>
  );
};

export const CRDCardRow = ({ csv, providedAPIs }: CRDCardRowProps) => {
  const { t } = useTranslation();
  return (
    <div className="co-crd-card-row">
      {providedAPIs.length ? (
        providedAPIs.map((crd) => (
          <CRDCard key={referenceForProvidedAPI(crd)} crd={crd} csv={csv} />
        ))
      ) : (
        <span className="text-muted">
          {t('olm~No Kubernetes APIs are being provided by this Operator.')}
        </span>
      )}
    </div>
  );
};

const InitializationResourceAlert: React.FC<InitializationResourceAlertProps> = (props) => {
  const { t } = useTranslation();
  const { initializationResource, csv } = props;

  const initializationResourceKind = initializationResource?.kind;
  const initializationResourceReference = referenceFor(initializationResource);
  const [model] = useK8sModel(initializationResourceReference);

  // Check if the CR is already present - only watches for the model in namespace
  const [customResource, customResourceLoaded] = useK8sWatchResource<K8sResourceCommon[]>({
    kind: initializationResourceReference,
    namespaced: true,
    isList: true,
  });

  const canCreateCustomResource = useAccessReviewAllowed({
    group: model?.apiGroup,
    resource: model?.plural,
    namespace: model?.namespaced
      ? initializationResource?.metadata.namespace || csv.metadata.namespace
      : null,
    verb: 'create',
  });

  if (customResourceLoaded && customResource.length === 0 && canCreateCustomResource) {
    return (
      <Alert
        isInline
        className="co-alert"
        variant="warning"
        title={t('olm~{{initializationResourceKind}} required', { initializationResourceKind })}
      >
        <p>
          {t('olm~Create a {{initializationResourceKind}} instance to use this Operator.', {
            initializationResourceKind,
          })}
        </p>
        <CreateInitializationResourceButton
          obj={props.csv}
          initializationResource={initializationResource}
        />
      </Alert>
    );
  }
  return null;
};

export const ClusterServiceVersionDetails: React.FC<ClusterServiceVersionDetailsProps> = (
  props,
) => {
  const { t } = useTranslation();
  const { spec, metadata, status } = props.obj;
  const { subscription } = props.customData;
  const providedAPIs = providedAPIsForCSV(props.obj);
  // TODO (jon) remove annotation destructuring and use helper functions
  const {
    'marketplace.openshift.io/support-workflow': marketplaceSupportWorkflow,
    'operatorframework.io/initialization-resource': initializationResourceJSON,
  } = metadata.annotations || {};

  const initializationResource = React.useMemo(() => {
    if (initializationResourceJSON) {
      try {
        return JSON.parse(initializationResourceJSON);
      } catch (error) {
        // eslint-disable-next-line no-console
        console.error('Error while parseing CSV initialization resource JSON', error.message);
      }
    }
    return null;
  }, [initializationResourceJSON]);

  const supportWorkflowUrl = React.useMemo(() => {
    if (marketplaceSupportWorkflow) {
      try {
        const url = new URL(marketplaceSupportWorkflow);
        url.searchParams.set('utm_source', 'openshift_console');
        return url.toString();
      } catch (error) {
        // eslint-disable-next-line no-console
        console.error('Error while setting utm_source to support workflow URL', error.message);
      }
    }
    return null;
  }, [marketplaceSupportWorkflow]);

  const csvPlugins = getClusterServiceVersionPlugins(metadata?.annotations);
  const permissions = _.uniqBy(spec?.install?.spec?.permissions, 'serviceAccountName');

  return (
    <>
      <ScrollToTopOnMount />

      <div className="co-m-pane__body">
        <div className="co-m-pane__body-group">
          <div className="row">
            <div className="col-sm-9">
              {status && status.phase === ClusterServiceVersionPhase.CSVPhaseFailed && (
                <Alert
                  isInline
                  className="co-alert"
                  variant="danger"
                  title={t('olm~Operator failed')}
                >
                  {status.reason === CSVConditionReason.CSVReasonCopied ? (
                    <>
                      <Trans t={t} ns="olm">
                        This Operator was copied from another namespace. For the reason it failed,
                        see{' '}
                        <ResourceLink
                          name={metadata.name}
                          kind={referenceForModel(ClusterServiceVersionModel)}
                          namespace={operatorNamespaceFor(props.obj)}
                          hideIcon
                          inline
                        />
                      </Trans>
                    </>
                  ) : (
                    status.message
                  )}
                </Alert>
              )}
              {initializationResource && (
                <InitializationResourceAlert
                  initializationResource={initializationResource}
                  csv={props.obj}
                />
              )}
              <SectionHeading text={t('olm~Provided APIs')} />
              <CRDCardRow csv={props.obj} providedAPIs={providedAPIs} />
              <SectionHeading text={t('olm~Description')} />
              <MarkdownView content={spec.description || t('olm~Not available')} />
            </div>
            <div className="col-sm-3">
              <dl className="co-clusterserviceversion-details__field">
                <dt>{t('olm~Provider')}</dt>
                <dd>
                  {spec.provider && spec.provider.name
                    ? spec.provider.name
                    : t('olm~Not available')}
                </dd>
                {supportWorkflowUrl && (
                  <>
                    <dt>{t('olm~Support')}</dt>
                    <dd>
                      <ExternalLink href={supportWorkflowUrl} text={t('olm~Get support')} />
                    </dd>
                  </>
                )}
                <dt>{t('olm~Created at')}</dt>
                <dd>
                  <Timestamp timestamp={metadata.creationTimestamp} />
                </dd>
              </dl>
              {csvPlugins.length > 0 && subscription && (
                <ConsolePlugins
                  csvPlugins={csvPlugins}
                  trusted={isCatalogSourceTrusted(subscription?.spec?.source)}
                />
              )}
              <dl className="co-clusterserviceversion-details__field">
                <dt>{t('olm~Links')}</dt>
                {spec.links && spec.links.length > 0 ? (
                  spec.links.map((link) => (
                    <dd key={link.url} style={{ display: 'flex', flexDirection: 'column' }}>
                      {link.name}{' '}
                      <ExternalLink
                        href={link.url}
                        text={link.url || '-'}
                        additionalClassName="co-break-all"
                      />
                    </dd>
                  ))
                ) : (
                  <dd>{t('olm~Not available')}</dd>
                )}
              </dl>
              <dl className="co-clusterserviceversion-details__field">
                <dt>{t('olm~Maintainers')}</dt>
                {spec.maintainers && spec.maintainers.length > 0 ? (
                  spec.maintainers.map((maintainer) => (
                    <dd key={maintainer.email} style={{ display: 'flex', flexDirection: 'column' }}>
                      {maintainer.name}{' '}
                      <a href={`mailto:${maintainer.email}`} className="co-break-all">
                        {maintainer.email || '-'}
                      </a>
                    </dd>
                  ))
                ) : (
                  <dd>{t('olm~Not available')}</dd>
                )}
              </dl>
            </div>
          </div>
        </div>
      </div>
      <div className="co-m-pane__body">
        <SectionHeading text={t('olm~ClusterServiceVersion details')} />
        <div className="co-m-pane__body-group">
          <div className="row">
            <div className="col-sm-6">
              <ResourceSummary resource={props.obj}>
                <dt>
                  <Popover
                    headerContent={<div>{t('olm~Managed Namespaces')}</div>}
                    bodyContent={
                      <div>{t('olm~Operands in this Namespace are managed by the Operator.')}</div>
                    }
                    maxWidth="30rem"
                  >
                    <Button variant="plain" className="details-item__popover-button">
                      {t('olm~Managed Namespaces')}
                    </Button>
                  </Popover>
                </dt>
                <dd>
                  <ManagedNamespaces obj={props.obj} />
                </dd>
              </ResourceSummary>
            </div>
            <div className="col-sm-6">
              <dt>{t('olm~Status')}</dt>
              <dd>
                <Status status={status ? status.phase : t('olm~Unknown')} />
              </dd>
              <dt>{t('olm~Status reason')}</dt>
              <dd>{status ? status.message : t('olm~Unknown')}</dd>
              {!_.isEmpty(spec.install.spec?.deployments) && (
                <>
                  <dt>{t('olm~Operator Deployments')}</dt>
                  {spec.install.spec.deployments.map(({ name }) => (
                    <dd key={name}>
                      <ResourceLink
                        name={name}
                        kind="Deployment"
                        namespace={operatorNamespaceFor(props.obj)}
                      />
                    </dd>
                  ))}
                </>
              )}
              {!_.isEmpty(permissions) && (
                <>
                  <dt>{t('olm~Operator ServiceAccounts')}</dt>
                  {permissions.map(({ serviceAccountName }) => (
                    <dd key={serviceAccountName} data-service-account-name={serviceAccountName}>
                      <ResourceLink
                        name={serviceAccountName}
                        kind="ServiceAccount"
                        namespace={operatorNamespaceFor(props.obj)}
                      />
                    </dd>
                  ))}
                </>
              )}
              <dt>{t('olm~OperatorGroup')}</dt>
              <dd>
                {operatorGroupFor(props.obj) ? (
                  <ResourceLink
                    name={operatorGroupFor(props.obj)}
                    namespace={operatorNamespaceFor(props.obj)}
                    kind={referenceForModel(OperatorGroupModel)}
                  />
                ) : (
                  '-'
                )}
              </dd>
            </div>
          </div>
        </div>
      </div>
      <div className="co-m-pane__body">
        <SectionHeading text={t('olm~Conditions')} />
        <Conditions
          conditions={(status?.conditions ?? []).map((c) => ({
            ...c,
            type: c.phase,
            status: 'True',
          }))}
          type={ConditionTypes.ClusterServiceVersion}
        />
      </div>
    </>
  );
};

export const CSVSubscription: React.FC<CSVSubscriptionProps> = ({ obj, customData, ...rest }) => {
  const { t } = useTranslation();
  const { subscription, subscriptions, subscriptionsLoaded, subscriptionsLoadError } =
    customData ?? {};
  const EmptyMsg = () => (
    <MsgBox
      title={t('olm~No Operator Subscription')}
      detail={t('olm~This Operator will not receive updates.')}
    />
  );

  return (
    <StatusBox
      EmptyMsg={EmptyMsg}
      loaded={subscriptionsLoaded}
      loadError={subscriptionsLoadError}
      data={subscription}
    >
      <SubscriptionDetails
        {...rest}
        obj={subscription}
        clusterServiceVersions={[obj]}
        subscriptions={subscriptions}
      />
    </StatusBox>
  );
};

type ClusterServiceVersionDetailsPageRouteParams = RouteParams<'name' | 'ns'>;

export const ClusterServiceVersionDetailsPage: React.FC<ClusterServiceVersionsDetailsPageProps> = (
  props,
) => {
  const { t } = useTranslation();
  const { name, ns } = useParams<ClusterServiceVersionDetailsPageRouteParams>();
  const [csv, csvLoaded, csvLoadError] = useClusterServiceVersion(name, ns);
  const namespace = operatorNamespaceFor(csv);
  const [subscriptions, subscriptionsLoaded, subscriptionsLoadError] = useK8sWatchResource<
    SubscriptionKind[]
  >(
    namespace
      ? {
          isList: true,
          groupVersionKind: getGroupVersionKindForModel(SubscriptionModel),
          namespace,
          optional: true,
        }
      : null,
  );
  const [canListClusterScopeInstallPlans] = useAccessReview({
    group: InstallPlanModel?.apiGroup,
    resource: InstallPlanModel?.plural,
    verb: 'list',
  });

  const subscription = React.useMemo(
    () => (subscriptions ?? []).find((s) => s.status.installedCSV === csv?.metadata?.name),
    [csv, subscriptions],
  );

  // eslint-disable-next-line react-hooks/exhaustive-deps
  const menuActions = React.useCallback(
    !subscription
      ? () => [Kebab.factory.Delete(ClusterServiceVersionModel, csv)]
      : () => [editSubscription(subscription), uninstall(subscription, csv)],
    [subscription],
  );

  const pagesFor = React.useCallback((obj: ClusterServiceVersionKind) => {
    const providedAPIs = providedAPIsForCSV(obj);
    return [
      navFactory.details(ClusterServiceVersionDetails),
      navFactory.editYaml(),
      {
        href: 'subscription',
        // t('olm~Subscription')
        nameKey: 'olm~Subscription',
        component: CSVSubscription,
      },
      navFactory.events(ResourceEventStream),
      ...(providedAPIs.length > 1
        ? [
            {
              href: 'instances',
              // t('olm~All instances')
              nameKey: 'olm~All instances',
              component: ProvidedAPIsPage,
            },
          ]
        : []),
      ...providedAPIs.map<Page<ProvidedAPIPageProps>>((api: CRDDescription) => ({
        href: referenceForProvidedAPI(api),
        name: ['Details', 'YAML', 'Subscription', 'Events'].includes(api.displayName)
          ? `${api.displayName} Operand`
          : api.displayName || api.kind,
        component: ProvidedAPIPage,
        pageData: {
          csv: obj,
          kind: referenceForProvidedAPI(api),
        },
      })),
    ];
  }, []);

  return (
    <DetailsPage
      {...props}
      obj={{ data: csv, loaded: csvLoaded, loadError: csvLoadError }}
      customData={{ subscriptions, subscription, subscriptionsLoaded, subscriptionsLoadError }}
      breadcrumbsFor={() => [
        {
          name: t('olm~Installed Operators'),
          path: getBreadcrumbPath(props.match),
        },
        { name: t('olm~Operator details'), path: props.match.url },
      ]}
      resources={[
        { kind: referenceForModel(PackageManifestModel), isList: true, prop: 'packageManifests' },
        {
          kind: referenceForModel(InstallPlanModel),
          isList: true,
          prop: 'installPlans',
          ...(canListClusterScopeInstallPlans ? {} : { namespace }),
        },
      ]}
      icon={({ obj }) => (
        <ClusterServiceVersionLogo
          displayName={obj?.spec?.displayName}
          icon={obj?.spec?.icon?.[0]}
          provider={obj?.spec?.provider}
          version={obj?.spec?.version}
        />
      )}
      namespace={props.match.params.ns}
      kind={referenceForModel(ClusterServiceVersionModel)}
      name={props.match.params.name}
      pagesFor={pagesFor}
      menuActions={menuActions}
      createRedirect
    />
  );
};

type ClusterServiceVersionStatusProps = {
  obj: ClusterServiceVersionKind;
  subscription: SubscriptionKind;
};

export type ClusterServiceVersionsPageProps = {
  kind: string;
  namespace: string;
  resourceDescriptions: CRDDescription[];
};

export type ClusterServiceVersionListProps = {
  loaded: boolean;
  loadError?: string;
  data: ClusterServiceVersionKind[];
  subscriptions: FirehoseResult<SubscriptionKind[]>;
  catalogSources: FirehoseResult<CatalogSourceKind[]>;
  activeNamespace?: string;
};

export type CRDCardProps = {
  canCreate?: boolean;
  crd: CRDDescription | APIServiceDefinition;
  csv?: ClusterServiceVersionKind;
  required?: boolean;
};

export type CRDCardRowProps = {
  providedAPIs: (CRDDescription | APIServiceDefinition)[];
  csv: ClusterServiceVersionKind;
};

export type CRDCardRowState = {
  expand: boolean;
};

export type ClusterServiceVersionsDetailsPageProps = {
  match: RouterMatch<any>;
};

export type ClusterServiceVersionDetailsProps = {
  obj: ClusterServiceVersionKind;
  customData: {
    subscriptions: SubscriptionKind[];
    subscription: SubscriptionKind;
    subscriptionsLoaded: boolean;
    subscriptionsLoadError?: any;
  };
};

type ConsolePluginsProps = {
  csvPlugins: string[];
  trusted: boolean;
};

type ConsolePluginStatusProps = {
  csv: ClusterServiceVersionKind;
  csvPlugins: string[];
};

type InstalledOperatorTableRowProps = RowFunctionArgs<
  ClusterServiceVersionKind | SubscriptionKind,
  {
    activeNamespace: string;
    catalogSources: CatalogSourceKind[];
    subscriptions: SubscriptionKind[];
  }
>;

export type ClusterServiceVersionTableRowProps = {
  obj: ClusterServiceVersionKind;
  catalogSourceMissing: boolean;
  subscription: SubscriptionKind;
  activeNamespace?: string;
};

type SubscriptionTableRowProps = {
  obj: SubscriptionKind;
  catalogSourceMissing: boolean;
  activeNamespace?: string;
};

type ManagedNamespacesProps = {
  obj: ClusterServiceVersionKind;
};

export type CSVSubscriptionProps = Omit<
  SubscriptionDetailsProps,
  'obj' | 'clusterServiceVersions' | 'subscriptions'
> &
  ClusterServiceVersionDetailsProps;

type InitializationResourceAlertProps = {
  csv: ClusterServiceVersionKind;
  initializationResource: K8sResourceCommon;
};

type Header = {
  title: string;
  sortField?: string;
  sortFunc?: string;
  transforms?: any;
  props: { className: string };
};

// TODO(alecmerdler): Find Webpack loader/plugin to add `displayName` to React components automagically
ClusterServiceVersionList.displayName = 'ClusterServiceVersionList';
ClusterServiceVersionsPage.displayName = 'ClusterServiceVersionsPage';
ClusterServiceVersionTableRow.displayName = 'ClusterServiceVersionTableRow';
CRDCard.displayName = 'CRDCard';
ClusterServiceVersionDetailsPage.displayName = 'ClusterServiceVersionsDetailsPage';
ClusterServiceVersionDetails.displayName = 'ClusterServiceVersionDetails';
CSVSubscription.displayName = 'CSVSubscription';
