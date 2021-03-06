import * as React from 'react';
import { useTranslation } from 'react-i18next';

import { GridItem, Text, TextVariants } from '@patternfly/react-core';

export const TolerationHeader = () => {
  const { t } = useTranslation();
  return (
    <>
      <GridItem span={4}>
        <Text component={TextVariants.h4}>{t('kubevirt-plugin~Taint Key')}</Text>
      </GridItem>
      <GridItem span={4}>
        <Text component={TextVariants.h4}>{t('kubevirt-plugin~Value')}</Text>
      </GridItem>
      <GridItem span={4}>
        <Text component={TextVariants.h4}>{t('kubevirt-plugin~Effect')}</Text>
      </GridItem>
    </>
  );
};
