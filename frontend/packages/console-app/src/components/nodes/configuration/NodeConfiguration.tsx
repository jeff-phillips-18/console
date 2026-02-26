import type { FC } from 'react';
import { Flex, FlexItem, Tab, Tabs, TabTitleText } from '@patternfly/react-core';
import { useTranslation } from 'react-i18next';
import type { NodeKind } from '@console/dynamic-plugin-sdk/src';
import { useQueryParamsMutator } from '@console/internal/components/utils';
import { useQueryParams } from '@console/shared/src';
import NodeStorage from './node-storage/NodeStorage';
import NodeMachine from './NodeMachine';

type NodeConfigurationProps = {
  obj: NodeKind;
};

const pages = [
  {
    tabId: 'storage',
    // t('console-app~Storage')
    nameKey: 'console-app~Storage',
    component: NodeStorage,
  },
  {
    tabId: 'machine',
    // t('console-app~Machine')
    nameKey: 'console-app~Machine',
    component: NodeMachine,
  },
];

export const NodeConfiguration: FC<NodeConfigurationProps> = ({ obj }) => {
  const { t } = useTranslation();
  const queryParams = useQueryParams();
  const { setQueryArgument } = useQueryParamsMutator();
  const activeTabKey = queryParams.get('activeTab');

  const setActiveTabKey = (key: string) => {
    setQueryArgument('activeTab', key);
  };

  const activePage = pages.find((page) => page.tabId === activeTabKey) ?? pages[0];
  const Component = activePage.component;

  return (
    <Flex
      className="pf-v6-u-h-100 pf-v6-u-ml-md"
      flexWrap={{ default: 'nowrap' }}
      spaceItems={{ default: 'spaceItemsMd' }}
      alignItems={{ default: 'alignItemsFlexStart' }}
    >
      <FlexItem className="pf-v6-u-h-100">
        <Tabs
          className="pf-v6-u-pt-md"
          activeKey={activeTabKey || pages[0].tabId}
          component="nav"
          isVertical
          usePageInsets
          isSubtab
          onSelect={(_e, tabId) => {
            setActiveTabKey(String(tabId));
          }}
        >
          {pages.map(({ nameKey, tabId }, index) => {
            return (
              <Tab
                key={tabId}
                eventKey={tabId}
                data-test-id={`horizontal-link-${nameKey ? nameKey.split('~')[1] : index}`}
                title={<TabTitleText>{t(nameKey)}</TabTitleText>}
                tabContentId={tabId}
              />
            );
          })}
        </Tabs>
      </FlexItem>
      {Component ? (
        <FlexItem flex={{ default: 'flex_1' }}>
          <Component obj={obj} />
        </FlexItem>
      ) : null}
    </Flex>
  );
};
