import * as React from 'react';
import { useTranslation } from 'react-i18next';
import { InputField } from '@console/shared/src';
import { TextInputTypes } from '@patternfly/react-core';
import { Resources } from '../../import/import-types';
import AdvancedStrategyOptions from './advanced-options/AdvancedStrategyOptions';
import { StrategyFieldProps } from './utils/types';

const RecreateStrategy: React.FC<StrategyFieldProps> = ({ resourceType }) => {
  const { t } = useTranslation();
  return resourceType === Resources.OpenShift ? (
    <>
      <InputField
        name="deploymentStrategy.data.timeoutSeconds"
        label={t('devconsole~Timeout')}
        type={TextInputTypes.number}
        helpText={t(
          'devconsole~The number of seconds to wait for a pod to scale up before giving up',
        )}
      />
      <AdvancedStrategyOptions />
    </>
  ) : null;
};

export default RecreateStrategy;
